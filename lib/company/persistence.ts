import type { Company } from "@/types";

const WORKSPACES_KEY = "zoreva:workspaces";
const OWNERS_KEY = "zoreva:owner-company";

type WorkspaceMap = Record<string, Company>;
type OwnerMap = Record<string, string>;

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

export function getCompanyById(companyId: string | null | undefined): Company | null {
  if (!companyId) return null;
  return getWorkspaces()[companyId] ?? null;
}

export function getCompanyIdForOwner(ownerId: string | null | undefined): string | null {
  if (!ownerId) return null;
  return getOwnerMap()[ownerId] ?? null;
}

export function hasCompletedSetup(ownerId: string | null | undefined): boolean {
  const companyId = getCompanyIdForOwner(ownerId);
  const company = getCompanyById(companyId);
  return Boolean(company?.setupCompletedAt);
}

export function saveCompany(company: Company) {
  const workspaces = getWorkspaces();
  workspaces[company.id] = company;
  writeJson(WORKSPACES_KEY, workspaces);

  const owners = getOwnerMap();
  owners[company.ownerId] = company.id;
  writeJson(OWNERS_KEY, owners);
}

export function loadCompanyForOwner(ownerId: string | null | undefined): Company | null {
  return getCompanyById(getCompanyIdForOwner(ownerId));
}
