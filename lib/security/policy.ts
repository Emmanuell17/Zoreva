import type { Company, CompanyMembership, HoursEntry, Role, ShiftSignup, User } from "@/types";

/** New join codes. 32-symbol alphabet at this length is not practical to guess. */
export const JOIN_CODE_MIN_LENGTH = 10;
export const JOIN_CODE_MAX_LENGTH = 12;
export const JOIN_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const PRIVATE_COMPANY_KEYS = [
  "id",
  "ownerId",
  "companyName",
  "managerName",
  "email",
  "employeeCount",
  "shiftTemplates",
  "setupCompletedAt",
  "joinCode",
  "joinCodeExpiresAt",
] as const;

export type AccessActor = {
  uid: string | null;
  membership: CompanyMembership | null;
  /** Trusted company.ownerId loaded from Firestore, when the caller has it. */
  ownerId?: string | null;
};

export type AccessDecision = { ok: true } | { ok: false; reason: string };

function membershipMatches(actor: AccessActor, companyId: string): boolean {
  const membership = actor.membership;
  return Boolean(
    actor.uid &&
      membership &&
      membership.userId === actor.uid &&
      membership.companyId === companyId &&
      (membership.role === "ADMIN" || membership.role === "EMPLOYEE"),
  );
}

export function isManager(actor: AccessActor, companyId: string): boolean {
  return Boolean(
    membershipMatches(actor, companyId) &&
      actor.membership?.role === "ADMIN" &&
      actor.ownerId &&
      actor.ownerId === actor.uid,
  );
}

export function isEmployee(actor: AccessActor, companyId: string): boolean {
  return Boolean(
    membershipMatches(actor, companyId) && actor.membership?.role === "EMPLOYEE",
  );
}

export function isMember(actor: AccessActor, companyId: string): boolean {
  return isManager(actor, companyId) || isEmployee(actor, companyId);
}

export function canReadPrivateCompany(actor: AccessActor, companyId: string): boolean {
  return isManager(actor, companyId);
}

export function canReadSchedule(actor: AccessActor, companyId: string): boolean {
  return isMember(actor, companyId);
}

export function canWriteSchedule(actor: AccessActor, companyId: string): boolean {
  return isManager(actor, companyId);
}

export function canReadHours(
  actor: AccessActor,
  companyId: string,
  employeeId: string,
): boolean {
  if (isManager(actor, companyId)) return true;
  return (
    isEmployee(actor, companyId) && actor.membership?.employeeId === employeeId
  );
}

export function canCreateOwnSignup(
  actor: AccessActor,
  companyId: string,
  signup: Pick<ShiftSignup, "employeeId" | "status">,
): boolean {
  return (
    isEmployee(actor, companyId) &&
    signup.employeeId === actor.membership?.employeeId &&
    signup.status === "SELECTED"
  );
}

export function canConfirmOwnSignup(
  actor: AccessActor,
  companyId: string,
  before: Pick<ShiftSignup, "employeeId" | "shiftId" | "status">,
  after: Pick<ShiftSignup, "employeeId" | "shiftId" | "status">,
): boolean {
  return (
    isEmployee(actor, companyId) &&
    before.employeeId === actor.membership?.employeeId &&
    after.employeeId === before.employeeId &&
    after.shiftId === before.shiftId &&
    before.status === "SELECTED" &&
    after.status === "CONFIRMED"
  );
}

export function canDeleteOwnSignup(
  actor: AccessActor,
  companyId: string,
  signup: Pick<ShiftSignup, "employeeId">,
): boolean {
  return (
    isEmployee(actor, companyId) &&
    signup.employeeId === actor.membership?.employeeId
  );
}

export function canCreateOwnHours(
  actor: AccessActor,
  companyId: string,
  entry: Pick<HoursEntry, "employeeId" | "status">,
): boolean {
  return (
    isEmployee(actor, companyId) &&
    entry.employeeId === actor.membership?.employeeId &&
    entry.status === "SUBMITTED"
  );
}

export function canRunAdvisor(actor: AccessActor, companyId: string): boolean {
  return isManager(actor, companyId);
}

export function joinCodeIsCurrent(
  code: string,
  expiresAtMs: number | null | undefined,
  now = Date.now(),
): boolean {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < JOIN_CODE_MIN_LENGTH || normalized.length > JOIN_CODE_MAX_LENGTH) {
    return false;
  }
  if (!expiresAtMs || !Number.isFinite(expiresAtMs)) return false;
  return expiresAtMs > now;
}

/**
 * Client-supplied role, company id, and employee id are ignored.
 * The decision uses only the verified user and the membership record.
 */
export function decideManagerAccess(input: {
  uid: string | null;
  membership: CompanyMembership | null;
  companyId: string | null;
  companyOwnerId: string | null;
}): AccessDecision {
  if (!input.uid) return { ok: false, reason: "Sign in is required." };
  const membership = input.membership;
  if (!membership || membership.userId !== input.uid) {
    return { ok: false, reason: "You do not have access to this company." };
  }
  if (membership.role !== "ADMIN") {
    return { ok: false, reason: "Only the manager can do that." };
  }
  if (!input.companyId || membership.companyId !== input.companyId) {
    return { ok: false, reason: "You do not have access to this company." };
  }
  if (!input.companyOwnerId || input.companyOwnerId !== input.uid) {
    return { ok: false, reason: "You do not have access to this company." };
  }
  return { ok: true };
}

export function membershipCreateAllowed(input: {
  uid: string;
  existing: CompanyMembership | null;
  next: CompanyMembership;
  companyOwnerId: string | null;
  joinCodeValid: boolean;
}): AccessDecision {
  if (input.existing) {
    return { ok: false, reason: "Membership cannot be changed." };
  }
  if (input.next.userId !== input.uid) {
    return { ok: false, reason: "You can only create your own membership." };
  }
  if (input.next.employeeId !== `${input.next.companyId}_${input.uid}`) {
    return { ok: false, reason: "Employee id does not match the signed-in user." };
  }
  if (input.next.role === "ADMIN") {
    if (input.companyOwnerId !== input.uid) {
      return { ok: false, reason: "Only the owner can be the manager." };
    }
    return { ok: true };
  }
  if (input.next.role === "EMPLOYEE") {
    if (!input.joinCodeValid) {
      return { ok: false, reason: "That join code is not valid." };
    }
    if (input.companyOwnerId && input.companyOwnerId === input.uid) {
      return { ok: false, reason: "The owner already manages this company." };
    }
    return { ok: true };
  }
  return { ok: false, reason: "That role is not allowed." };
}

export function companyUpdateAllowed(
  before: Pick<Company, "id" | "ownerId" | "setupCompletedAt">,
  after: Pick<Company, "id" | "ownerId" | "setupCompletedAt"> & Record<string, unknown>,
): AccessDecision {
  if (after.ownerId !== before.ownerId) {
    return { ok: false, reason: "Ownership cannot be changed." };
  }
  if (after.id !== before.id) {
    return { ok: false, reason: "Company id cannot be changed." };
  }
  if (after.setupCompletedAt !== before.setupCompletedAt) {
    return { ok: false, reason: "Setup time cannot be changed." };
  }
  const forbidden = ["employees", "signups", "hours", "shifts", "role", "authUid"];
  for (const key of forbidden) {
    if (key in after) {
      return { ok: false, reason: "That field cannot be stored on the company." };
    }
  }
  return { ok: true };
}

export function privateCompanyPayload(company: Company): Record<string, unknown> {
  const expiresAt = company.joinCodeExpiresAt
    ? Date.parse(company.joinCodeExpiresAt)
    : NaN;
  return {
    id: company.id,
    ownerId: company.ownerId,
    companyName: company.companyName,
    managerName: company.managerName,
    email: company.email,
    employeeCount: company.employeeCount,
    shiftTemplates: company.shiftTemplates,
    setupCompletedAt: company.setupCompletedAt,
    joinCode: company.joinCode.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    joinCodeExpiresAt: expiresAt,
  };
}

export function publishedSchedulePayload(company: Company): Record<string, unknown> {
  return {
    companyName: company.companyName,
    shiftTemplates: company.shiftTemplates,
    shifts: company.shifts,
  };
}

export function rosterPayload(employee: User, companyId: string): Record<string, unknown> | null {
  if (employee.role === "ADMIN") return null;
  return {
    id: employee.id,
    name: employee.name.slice(0, 80) || "Employee",
    role: "EMPLOYEE" satisfies Role,
    companyId,
    createdAt:
      typeof employee.createdAt === "string"
        ? employee.createdAt
        : new Date(employee.createdAt).toISOString(),
  };
}

export function redactCompanyForMember(
  company: Company,
  actor: AccessActor,
): Company | null {
  if (!actor.uid || !actor.membership || actor.membership.userId !== actor.uid) {
    return null;
  }
  if (actor.membership.companyId !== company.id) return null;
  if (isManager({ ...actor, ownerId: company.ownerId }, company.id)) {
    return company;
  }
  if (!isEmployee(actor, company.id)) return null;

  const employeeId = actor.membership.employeeId;
  return {
    ...company,
    ownerId: "",
    email: "",
    managerName: "",
    joinCode: "",
    joinCodeExpiresAt: undefined,
    employees: company.employees.map((employee) => ({
      ...employee,
      email: employee.id === employeeId ? employee.email : "",
      authUid: employee.id === employeeId ? employee.authUid : null,
      role: "EMPLOYEE",
    })),
    hours: company.hours.filter((entry) => entry.employeeId === employeeId),
  };
}
