import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import { CURRENT_EMPLOYEE_ID, usersSeed } from "@/lib/mocks/users";
import {
  loadCompanyIdForEmailRemote,
  loadCompanyIdForJoinCodeRemote,
  loadCompanyIdForOwnerRemote,
  loadCompanyRemote,
  loadMembershipRemote,
  watchCompanyRemote,
} from "@/lib/company/cloud";
import { attachAuthEmployee } from "@/lib/company/membership";
import {
  findLocalCompanyForManager,
  getCompanyById,
  getCompanyIdForJoinCode,
  getMembership,
  hasCompletedSetup as readCompletedSetup,
  hasJoinedCompany as readJoinedCompany,
  persistCompany,
  persistMembership,
  saveCompany,
  saveCompanyLocal,
  saveMembership,
  saveOwnerEmail,
  uniqueJoinCode,
} from "@/lib/company/persistence";
import { normalizeJoinCode } from "@/lib/company/join-code";
import { normalizeEmail } from "@/lib/company/email";
import { buildCompanyWorkspace } from "@/lib/company/build-workspace";
import type {
  Company,
  CompanyMembership,
  CompanySetupInput,
  HoursEntry,
  Role,
  Shift,
  ShiftSignup,
  User,
} from "@/types";
import type { Unsubscribe } from "firebase/firestore";

type ScheduleState = {
  shifts: Shift[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
};

type ScheduleBridge = {
  load: (state: ScheduleState) => void;
};

let activeCompany: Company | null = null;
let currentEmployeeId = CURRENT_EMPLOYEE_ID;
let applyingSchedule = false;
let scheduleBridge: ScheduleBridge | null = null;
let remoteUnsub: Unsubscribe | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function demoSchedule(): ScheduleState {
  return {
    shifts: shiftsSeed.map((shift) => ({ ...shift })),
    signups: signupsSeed.map((signup) => ({ ...signup })),
    hours: hoursSeed.map((entry) => ({ ...entry })),
  };
}

function stopWatch() {
  remoteUnsub?.();
  remoteUnsub = null;
}

function startWatch(companyId: string) {
  stopWatch();
  remoteUnsub = watchCompanyRemote(companyId, (company) => {
    if (applyingSchedule) return;
    if (!activeCompany || activeCompany.id !== company.id) return;
    saveCompanyLocal(company);
    applyCompany(company, { persist: false });
  });
}

export function subscribeCompany(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveCompany(): Company | null {
  return activeCompany;
}

export function getCurrentEmployeeId(): string {
  return currentEmployeeId;
}

export function getActiveEmployees(): User[] {
  if (activeCompany) {
    return activeCompany.employees.map((employee) => ({ ...employee }));
  }
  return usersSeed.map((user) => ({ ...user }));
}

export function registerScheduleBridge(bridge: ScheduleBridge) {
  scheduleBridge = bridge;
}

export function persistActiveSchedule(state: ScheduleState) {
  if (applyingSchedule || !activeCompany) return;

  activeCompany = {
    ...activeCompany,
    shifts: state.shifts.map((shift) => ({ ...shift })),
    signups: state.signups.map((signup) => ({ ...signup })),
    hours: state.hours.map((entry) => ({ ...entry })),
  };
  saveCompany(activeCompany);
}

function applyCompany(
  company: Company | null,
  options?: { persist?: boolean; employeeId?: string },
) {
  activeCompany = company;
  currentEmployeeId = options?.employeeId ?? currentEmployeeId;
  if (!company) {
    currentEmployeeId = CURRENT_EMPLOYEE_ID;
  }

  applyingSchedule = true;
  scheduleBridge?.load(
    company
      ? {
          shifts: company.shifts.map((shift) => ({ ...shift })),
          signups: company.signups.map((signup) => ({ ...signup })),
          hours: company.hours.map((entry) => ({ ...entry })),
        }
      : demoSchedule(),
  );
  applyingSchedule = false;

  if (company && options?.persist !== false) {
    saveCompany(company);
  }

  notify();
}

export function activateDemoWorkspace() {
  stopWatch();
  if (activeCompany === null && typeof window === "undefined") return;
  applyCompany(null);
}

function activateCompany(company: Company, employeeId?: string) {
  applyCompany(company, { persist: false, employeeId });
  startWatch(company.id);
}

export function activateWorkspaceForOwner(
  ownerId: string | null | undefined,
  email?: string | null,
) {
  if (!ownerId) {
    activateDemoWorkspace();
    return false;
  }

  const company = findLocalCompanyForManager({ ownerId, email });
  if (!company) {
    activateDemoWorkspace();
    return false;
  }

  activateCompany(ensureJoinCode(company));
  return true;
}

export function activateWorkspaceForMember(userId: string | null | undefined) {
  if (!userId) {
    activateDemoWorkspace();
    return false;
  }

  const membership = getMembership(userId);
  const company = getCompanyById(membership?.companyId);
  if (!membership || !company) {
    activateDemoWorkspace();
    return false;
  }

  activateCompany(ensureJoinCode(company), membership.employeeId);
  return true;
}

function ensureJoinCode(company: Company): Company {
  if (normalizeJoinCode(company.joinCode)) {
    return saveCompanyLocal(company);
  }
  return saveCompany({ ...company, joinCode: uniqueJoinCode() });
}

export function hasCompletedSetup(
  ownerId: string | null | undefined,
  email?: string | null,
): boolean {
  return readCompletedSetup(ownerId, email);
}

export function hasJoinedCompany(userId: string | null | undefined): boolean {
  return readJoinedCompany(userId);
}

export function createCompanyWorkspace(
  ownerId: string,
  input: CompanySetupInput,
): Company {
  const company = buildCompanyWorkspace(ownerId, input);
  const saved = saveCompany(company);
  activateCompany(saved);
  return saved;
}

export async function persistNewCompanyWorkspace(
  ownerId: string,
  input: CompanySetupInput,
): Promise<Company> {
  const company = buildCompanyWorkspace(ownerId, input);
  const saved = await persistCompany(company);
  activateCompany(saved);
  return saved;
}

export function updateShiftTemplateTimes(
  updates: Array<{ name: string; startTime: string; endTime: string }>,
) {
  if (!activeCompany || updates.length === 0) return;

  const byName = new Map(updates.map((item) => [item.name, item]));
  activeCompany = {
    ...activeCompany,
    shiftTemplates: activeCompany.shiftTemplates.map((template) => {
      const next = byName.get(template.name);
      if (!next) return template;
      return {
        ...template,
        startTime: next.startTime,
        endTime: next.endTime,
      };
    }),
  };
  saveCompany(activeCompany);
  notify();
}

export function ownerIdFromAuth(options: {
  uid?: string | null;
  configured: boolean;
}): string | null {
  if (options.uid) return options.uid;
  if (!options.configured) return "local-dev";
  return null;
}

async function claimCompanyForManager(
  company: Company,
  options: { ownerId: string; email?: string | null },
): Promise<Company> {
  const email = options.email?.trim() ?? "";
  const next: Company = {
    ...company,
    ownerId: options.ownerId,
    email: company.email || email,
  };
  const unchanged =
    next.ownerId === company.ownerId &&
    normalizeEmail(next.email) === normalizeEmail(company.email);
  const saved = unchanged
    ? ensureJoinCode(next)
    : await persistCompany(ensureJoinCode(next));
  if (email) saveOwnerEmail(email, saved.id);
  return saved;
}

async function cacheRemoteCompany(companyId: string | null | undefined) {
  if (!companyId) return null;
  const local = getCompanyById(companyId);
  try {
    const remote = await loadCompanyRemote(companyId);
    if (remote) {
      return saveCompanyLocal(remote);
    }
  } catch {
    // Fall back to the local copy if Firestore is unreachable.
  }
  return local ? ensureJoinCode(local) : null;
}

export async function hydrateWorkspace(options: {
  role: Role | null;
  uid?: string | null;
  email?: string | null;
  configured: boolean;
}): Promise<void> {
  const ownerId = ownerIdFromAuth({
    uid: options.uid,
    configured: options.configured,
  });

  if (options.role === "ADMIN" && ownerId) {
    let company = findLocalCompanyForManager({
      ownerId,
      email: options.email,
    });

    if (!company) {
      let remoteId: string | null = null;
      try {
        remoteId = await loadCompanyIdForOwnerRemote(ownerId);
        if (!remoteId) {
          remoteId = await loadCompanyIdForEmailRemote(options.email);
        }
      } catch {
        remoteId = null;
      }
      company = await cacheRemoteCompany(remoteId);
    } else {
      company = (await cacheRemoteCompany(company.id)) ?? company;
    }

    if (company) {
      const claimed = await claimCompanyForManager(company, {
        ownerId,
        email: options.email,
      });
      activateCompany(claimed);
      return;
    }
  }

  if (options.role === "EMPLOYEE" && options.uid) {
    let membership = getMembership(options.uid);
    if (!membership) {
      membership = await loadMembershipRemote(options.uid);
      if (membership) saveMembership(membership);
    }
    if (membership) {
      const company = await cacheRemoteCompany(membership.companyId);
      if (company) {
        activateCompany(ensureJoinCode(company), membership.employeeId);
        return;
      }
    }
    stopWatch();
    applyCompany(null);
    return;
  }

  if (!options.configured && ownerId && options.role !== "EMPLOYEE") {
    const activated = activateWorkspaceForOwner(ownerId);
    if (activated) return;
  }

  activateDemoWorkspace();
}

export async function joinCompanyWithCode(input: {
  userId: string;
  code: string;
  name: string;
  email: string;
}): Promise<{ ok: true; company: Company } | { ok: false; reason: string }> {
  const code = normalizeJoinCode(input.code);
  if (code.length < 4) {
    return { ok: false, reason: "Enter the 6-character code from your manager." };
  }

  let companyId = getCompanyIdForJoinCode(code);
  if (!companyId) {
    companyId = await loadCompanyIdForJoinCodeRemote(code);
  }

  const company = companyId ? await cacheRemoteCompany(companyId) : null;
  if (!company) {
    return {
      ok: false,
      reason:
        "That code was not found. Check it with your manager, or wait a moment if they just set up the company.",
    };
  }

  const attached = attachAuthEmployee(company, {
    userId: input.userId,
    name: input.name,
    email: input.email,
  });
  const saved = await persistCompany(attached.company);
  const membership: CompanyMembership = {
    userId: input.userId,
    companyId: saved.id,
    employeeId: attached.employee.id,
    role: "EMPLOYEE",
  };
  await persistMembership(membership);
  activateCompany(saved, attached.employee.id);
  return { ok: true, company: saved };
}
