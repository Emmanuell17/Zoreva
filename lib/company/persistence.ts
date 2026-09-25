import type { Company, CompanyMembership } from "@/types";
import {
  saveCompanyRemote,
  saveMembershipRemote,
} from "@/lib/company/cloud";
import { generateJoinCode, normalizeJoinCode } from "@/lib/company/join-code";
import { LOCAL_OWNER_ID } from "@/lib/company/defaults";
import { normalizeEmail } from "@/lib/company/email";

const WORKSPACES_KEY = "zoreva:workspaces";
const OWNERS_KEY = "zoreva:owner-company";
const EMAILS_KEY = "zoreva:email-company";
const JOIN_CODES_KEY = "zoreva:join-codes";
const MEMBERSHIPS_KEY = "zoreva:memberships";

type WorkspaceMap = Record<string, Company>;
type OwnerMap = Record<string, string>;
type JoinCodeMap = Record<string, string>;
type MembershipMap = Record<string, CompanyMembership>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getWorkspaces(): WorkspaceMap {
  return readJson<WorkspaceMap>(WORKSPACES_KEY, {});
}

export function getOwnerMap(): OwnerMap {
  return readJson<OwnerMap>(OWNERS_KEY, {});
}

export function getEmailMap(): OwnerMap {
  return readJson<OwnerMap>(EMAILS_KEY, {});
}

export function getJoinCodeMap(): JoinCodeMap {
  return readJson<JoinCodeMap>(JOIN_CODES_KEY, {});
}

export function getMembershipMap(): MembershipMap {
  return readJson<MembershipMap>(MEMBERSHIPS_KEY, {});
}

export function getCompanyById(companyId: string | null | undefined): Company | null {
  if (!companyId) return null;
  return getWorkspaces()[companyId] ?? null;
}

export function getCompanyIdForOwner(ownerId: string | null | undefined): string | null {
  if (!ownerId) return null;
  return getOwnerMap()[ownerId] ?? null;
}

export function getCompanyIdForEmail(email: string | null | undefined): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return getEmailMap()[normalized] ?? null;
}

export function saveOwnerEmail(email: string, companyId: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const emails = getEmailMap();
  emails[normalized] = companyId;
  writeJson(EMAILS_KEY, emails);
}

function newestCompany(companies: Company[]): Company | null {
  if (companies.length === 0) return null;
  return [...companies].sort((a, b) =>
    String(b.setupCompletedAt).localeCompare(String(a.setupCompletedAt)),
  )[0];
}

export function findLocalCompanyForManager(options: {
  ownerId?: string | null;
  email?: string | null;
}): Company | null {
  const ownerId = options.ownerId ?? "";
  const email = normalizeEmail(options.email);

  const byOwner = getCompanyById(getCompanyIdForOwner(ownerId));
  if (byOwner?.setupCompletedAt) return byOwner;

  const byEmailId = getCompanyById(getCompanyIdForEmail(email));
  if (byEmailId?.setupCompletedAt) return byEmailId;

  const completed = Object.values(getWorkspaces()).filter(
    (company) => Boolean(company.setupCompletedAt),
  );

  const emailMatches = email
    ? completed.filter((company) => normalizeEmail(company.email) === email)
    : [];
  const emailMatch = newestCompany(emailMatches);
  if (emailMatch) return emailMatch;

  const ownerMatch = newestCompany(
    completed.filter((company) => company.ownerId === ownerId),
  );
  if (ownerMatch) return ownerMatch;

  if (ownerId && ownerId !== LOCAL_OWNER_ID) {
    const localDev = newestCompany(
      completed.filter((company) => company.ownerId === LOCAL_OWNER_ID),
    );
    if (localDev && completed.length === 1) return localDev;
  }

  if (ownerId && completed.length === 1) return completed[0];

  return null;
}

export function getCompanyIdForJoinCode(code: string | null | undefined): string | null {
  const normalized = code ? normalizeJoinCode(code) : "";
  if (!normalized) return null;
  return getJoinCodeMap()[normalized] ?? null;
}

export function getMembership(userId: string | null | undefined): CompanyMembership | null {
  if (!userId) return null;
  return getMembershipMap()[userId] ?? null;
}

export function hasCompletedSetup(
  ownerId: string | null | undefined,
  email?: string | null,
): boolean {
  return Boolean(
    findLocalCompanyForManager({ ownerId, email })?.setupCompletedAt,
  );
}

export function hasJoinedCompany(userId: string | null | undefined): boolean {
  const membership = getMembership(userId);
  return Boolean(membership?.companyId && getCompanyById(membership.companyId));
}

export function saveJoinCode(code: string, companyId: string) {
  const normalized = normalizeJoinCode(code);
  if (!normalized) return;
  const codes = getJoinCodeMap();
  codes[normalized] = companyId;
  writeJson(JOIN_CODES_KEY, codes);
}

export function saveMembership(membership: CompanyMembership) {
  const memberships = getMembershipMap();
  memberships[membership.userId] = membership;
  writeJson(MEMBERSHIPS_KEY, memberships);
  void saveMembershipRemote(membership).catch(() => undefined);
}

export async function persistMembership(membership: CompanyMembership) {
  const memberships = getMembershipMap();
  memberships[membership.userId] = membership;
  writeJson(MEMBERSHIPS_KEY, memberships);
  try {
    await saveMembershipRemote(membership);
  } catch {
    // Local membership still lets this device open the company.
  }
  return membership;
}

export function clearMembership(userId: string | null | undefined) {
  if (!userId) return;
  const memberships = getMembershipMap();
  delete memberships[userId];
  writeJson(MEMBERSHIPS_KEY, memberships);
}

export function uniqueJoinCode(existing?: string): string {
  if (existing && normalizeJoinCode(existing)) return normalizeJoinCode(existing);

  const used = new Set(Object.keys(getJoinCodeMap()));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateJoinCode();
    if (!used.has(code)) return code;
  }
  return generateJoinCode(8);
}

export function saveCompanyLocal(company: Company) {
  const joinCode = uniqueJoinCode(company.joinCode);
  const next: Company = { ...company, joinCode };
  const workspaces = getWorkspaces();
  workspaces[next.id] = next;
  writeJson(WORKSPACES_KEY, workspaces);

  const owners = getOwnerMap();
  owners[next.ownerId] = next.id;
  writeJson(OWNERS_KEY, owners);
  saveJoinCode(joinCode, next.id);
  saveOwnerEmail(next.email, next.id);
  return next;
}

export function saveCompany(company: Company) {
  const next = saveCompanyLocal(company);
  void saveCompanyRemote(next).catch(() => undefined);
  return next;
}

export async function persistCompany(company: Company) {
  const next = saveCompanyLocal(company);
  try {
    await saveCompanyRemote(next);
  } catch {
    // Local workspace still works on this device.
  }
  return next;
}

export function loadCompanyForOwner(ownerId: string | null | undefined): Company | null {
  return findLocalCompanyForManager({ ownerId });
}
