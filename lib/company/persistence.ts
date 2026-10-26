import type { Company, CompanyMembership } from "@/types";
import { createManagerWorkspaceRemote } from "@/lib/company/cloud";
import { generateJoinCode, normalizeJoinCode } from "@/lib/company/join-code";
import { LOCAL_OWNER_ID } from "@/lib/company/defaults";
import { normalizeEmail } from "@/lib/company/email";
import { JOIN_CODE_MAX_LENGTH, JOIN_CODE_MIN_LENGTH, JOIN_CODE_TTL_MS, joinCodeIsCurrent } from "@/lib/security/policy";

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

export function companyMatchesManager(
  company: Company | null | undefined,
  options: { ownerId?: string | null; email?: string | null },
): boolean {
  if (!company?.setupCompletedAt) return false;

  const ownerId = options.ownerId ?? "";
  if (ownerId && company.ownerId === ownerId) return true;
  if (company.ownerId && company.ownerId !== LOCAL_OWNER_ID) return false;

  const email = normalizeEmail(options.email);
  if (!email) return false;
  return !company.email || normalizeEmail(company.email) === email;
}

export function findLocalCompanyForManager(options: {
  ownerId?: string | null;
  email?: string | null;
}): Company | null {
  const ownerId = options.ownerId ?? "";
  const email = normalizeEmail(options.email);
  const seen = new Set<string>();
  const candidates: Company[] = [];

  function add(company: Company | null) {
    if (!company || seen.has(company.id)) return;
    seen.add(company.id);
    candidates.push(company);
  }

  add(getCompanyById(getCompanyIdForOwner(ownerId)));
  add(getCompanyById(getCompanyIdForEmail(email)));
  for (const company of Object.values(getWorkspaces())) add(company);

  const matches = candidates.filter((company) =>
    companyMatchesManager(company, { ownerId, email }),
  );
  const owned = newestCompany(
    matches.filter((company) => ownerId && company.ownerId === ownerId),
  );
  if (owned) return owned;

  return newestCompany(
    matches.filter(
      (company) => !company.ownerId || company.ownerId === LOCAL_OWNER_ID,
    ),
  );
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
}

export function withSecureJoinCode(
  company: Company,
  now = Date.now(),
): { company: Company; previousJoinCode: string | null } {
  const previous = normalizeJoinCode(company.joinCode);
  const expiresAt = company.joinCodeExpiresAt ? Date.parse(company.joinCodeExpiresAt) : NaN;
  if (joinCodeIsCurrent(previous, expiresAt, now)) {
    return {
      company: {
        ...company,
        joinCode: previous,
        joinCodeExpiresAt: new Date(expiresAt).toISOString(),
      },
      previousJoinCode: null,
    };
  }

  return {
    company: {
      ...company,
      joinCode: uniqueJoinCode(),
      joinCodeExpiresAt: new Date(now + JOIN_CODE_TTL_MS).toISOString(),
    },
    previousJoinCode: previous || null,
  };
}

export function uniqueJoinCode(existing?: string): string {
  const normalized = existing ? normalizeJoinCode(existing) : "";
  if (
    normalized.length >= JOIN_CODE_MIN_LENGTH &&
    normalized.length <= JOIN_CODE_MAX_LENGTH
  ) {
    return normalized;
  }

  const used = new Set(Object.keys(getJoinCodeMap()));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateJoinCode();
    if (!used.has(code)) return code;
  }
  return generateJoinCode(12);
}

export function saveCompanyLocal(company: Company) {
  const next: Company = { ...company, joinCode: normalizeJoinCode(company.joinCode) };
  const workspaces = getWorkspaces();
  workspaces[next.id] = next;
  writeJson(WORKSPACES_KEY, workspaces);

  if (next.ownerId) {
    const owners = getOwnerMap();
    owners[next.ownerId] = next.id;
    writeJson(OWNERS_KEY, owners);
  }
  if (next.joinCode) saveJoinCode(next.joinCode, next.id);
  saveOwnerEmail(next.email, next.id);
  return next;
}

export function saveCompany(company: Company) {
  return saveCompanyLocal(company);
}

export async function persistCompany(
  company: Company,
  options?: { mode?: "create" | "local"; authEmail?: string | null },
) {
  const secured = withSecureJoinCode(company).company;
  if (options?.mode === "create") {
    await createManagerWorkspaceRemote(secured, options.authEmail ?? secured.email);
  }
  return saveCompanyLocal(secured);
}