import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import { CURRENT_EMPLOYEE_ID, usersSeed } from "@/lib/mocks/users";
import {
  JoinFailed,
  ensureOwnerMembershipRemote,
  isPermissionDenied,
  joinCompanyRemote,
  loadCompanyIdForEmailRemote,
  loadCompanyIdForOwnerRemote,
  loadEmployeeCompanyRemote,
  loadManagerCompanyRemote,
  loadMembershipRemote,
  migrateManagerWorkspaceRemote,
  syncEmployeeActivityRemote,
  updatePublishedScheduleRemote,
  watchEmployeeWorkspace,
  watchManagerWorkspace,
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
  saveCompanyLocal,
  saveMembership,
  saveOwnerEmail,
  withSecureJoinCode,
} from "@/lib/company/persistence";
import { normalizeJoinCode } from "@/lib/company/join-code";
import { canUseFirestore } from "@/lib/firebase/firestore";
import { redactCompanyForMember } from "@/lib/security/policy";
import { isShiftDatePassed } from "@/lib/shift-utils";
import { buildCompanyWorkspace } from "@/lib/company/build-workspace";
import type {
  Company,
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

type SessionAccess = {
  uid: string;
  role: Role;
  companyId: string;
  employeeId: string;
};

let session: SessionAccess | null = null;

function setSession(next: SessionAccess | null) {
  session = next;
}

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
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onWorkspaceVisible);
  }
}

function withoutPassedShifts(company: Company, now = new Date()): Company | null {
  const expired = new Set(
    company.shifts
      .filter((shift) => isShiftDatePassed(shift.date, now))
      .map((shift) => shift.id),
  );
  if (expired.size === 0) return null;

  return {
    ...company,
    shifts: company.shifts.filter((shift) => !expired.has(shift.id)),
    signups: company.signups.filter((signup) => !expired.has(signup.shiftId)),
    hours: company.hours.filter((entry) => !expired.has(entry.shiftId)),
  };
}

function dropPassedShifts() {
  if (!activeCompany || applyingSchedule) return;
  const next = withoutPassedShifts(activeCompany);
  if (!next) return;
  applyCompany(next, { persist: true });
}

function onWorkspaceVisible() {
  if (document.visibilityState === "visible") dropPassedShifts();
}

function acceptRemoteCompany(company: Company) {
  if (applyingSchedule) return;
  if (!activeCompany || activeCompany.id !== company.id || !session) return;
  const view =
    session.role === "EMPLOYEE"
      ? redactCompanyForMember(company, {
          uid: session.uid,
          membership: {
            userId: session.uid,
            companyId: session.companyId,
            employeeId: session.employeeId,
            role: "EMPLOYEE",
          },
        })
      : company;
  if (!view) return;
  saveCompanyLocal(view);
  applyCompany(view, { persist: false, employeeId: session.employeeId });
}

function startWatch(companyId: string) {
  stopWatch();
  if (session?.companyId === companyId) {
    remoteUnsub =
      session.role === "ADMIN"
        ? watchManagerWorkspace(companyId, acceptRemoteCompany)
        : watchEmployeeWorkspace(companyId, session.employeeId, acceptRemoteCompany);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onWorkspaceVisible);
  }
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

  const previous = activeCompany;
  activeCompany = saveCompanyLocal({
    ...activeCompany,
    shifts: state.shifts.map((shift) => ({ ...shift })),
    signups: state.signups.map((signup) => ({ ...signup })),
    hours: state.hours.map((entry) => ({ ...entry })),
  });
  if (!session || session.companyId !== activeCompany.id || !canUseFirestore()) return;
  if (session.role === "ADMIN") {
    void updatePublishedScheduleRemote(activeCompany).catch(() => undefined);
    return;
  }
  void syncEmployeeActivityRemote(
    session.companyId,
    session.employeeId,
    previous,
    activeCompany,
  ).catch(() => undefined);
}

function applyCompany(
  company: Company | null,
  options?: { persist?: boolean; employeeId?: string },
) {
  const pruned = company ? withoutPassedShifts(company) : null;
  const next = pruned ?? company;
  activeCompany = next;
  currentEmployeeId = options?.employeeId ?? currentEmployeeId;
  if (!next) {
    currentEmployeeId = CURRENT_EMPLOYEE_ID;
  }

  applyingSchedule = true;
  scheduleBridge?.load(
    next
      ? {
          shifts: next.shifts.map((shift) => ({ ...shift })),
          signups: next.signups.map((signup) => ({ ...signup })),
          hours: next.hours.map((entry) => ({ ...entry })),
        }
      : demoSchedule(),
  );
  applyingSchedule = false;

  if (next && (pruned || options?.persist !== false)) {
    activeCompany = saveCompanyLocal(next);
    if (session?.role === "ADMIN" && session.companyId === next.id && canUseFirestore()) {
      void updatePublishedScheduleRemote(activeCompany).catch(() => undefined);
    }
  }

  notify();
}

export function activateDemoWorkspace() {
  stopWatch();
  setSession(null);
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

  activateCompany(company, membership.employeeId);
  return true;
}

function ensureJoinCode(company: Company): Company {
  if (normalizeJoinCode(company.joinCode)) return saveCompanyLocal(company);
  return saveCompanyLocal(withSecureJoinCode(company).company);
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

export async function persistNewCompanyWorkspace(
  ownerId: string,
  input: CompanySetupInput,
  authEmail?: string | null,
): Promise<Company> {
  const company = buildCompanyWorkspace(ownerId, input);
  const saved = await persistCompany(company, {
    mode: canUseFirestore() ? "create" : "local",
    authEmail: authEmail ?? input.email,
  });
  setSession({
    uid: ownerId,
    role: "ADMIN",
    companyId: saved.id,
    employeeId: `${saved.id}_${ownerId}`,
  });
  activateCompany(saved);
  return saved;
}

export function ownerIdFromAuth(options: {
  uid?: string | null;
  configured: boolean;
}): string | null {
  if (options.uid) return options.uid;
  if (!options.configured) return "local-dev";
  return null;
}

async function publishManagerCompany(company: Company, uid: string): Promise<Company | null> {
  if (company.ownerId !== uid) return null;
  const rotated = withSecureJoinCode(company);
  const membership = await loadMembershipRemote(uid);
  if (
    membership &&
    (membership.userId !== uid ||
      membership.role !== "ADMIN" ||
      membership.companyId !== company.id)
  ) {
    return null;
  }
  if (!membership) {
    try {
      await ensureOwnerMembershipRemote(rotated.company);
    } catch (error) {
      if (isPermissionDenied(error)) return null;
      throw error;
    }
  }
  try {
    await migrateManagerWorkspaceRemote(rotated.company, rotated.previousJoinCode);
  } catch (error) {
    if (isPermissionDenied(error)) return null;
    throw error;
  }
  return saveCompanyLocal(rotated.company);
}

function activateManager(company: Company, uid: string) {
  setSession({
    uid,
    role: "ADMIN",
    companyId: company.id,
    employeeId: `${company.id}_${uid}`,
  });
  activateCompany(company);
}

function activateEmployee(company: Company, uid: string, employeeId: string) {
  const view =
    redactCompanyForMember(
      { ...company, id: company.id },
      {
        uid,
        membership: {
          userId: uid,
          companyId: company.id,
          employeeId,
          role: "EMPLOYEE",
        },
      },
    ) ?? company;
  setSession({
    uid,
    role: "EMPLOYEE",
    companyId: company.id,
    employeeId,
  });
  saveMembership({
    userId: uid,
    companyId: company.id,
    employeeId,
    role: "EMPLOYEE",
  });
  activateCompany(saveCompanyLocal(view), employeeId);
}

export async function hydrateWorkspace(options: {
  role: Role | null;
  uid?: string | null;
  email?: string | null;
  configured: boolean;
}): Promise<{ role: Role | null }> {
  const ownerId = ownerIdFromAuth({
    uid: options.uid,
    configured: options.configured,
  });

  if (options.configured && options.uid && canUseFirestore()) {
    const membership = await loadMembershipRemote(options.uid);
    if (
      membership &&
      membership.userId === options.uid &&
      membership.role === "ADMIN"
    ) {
      const loaded = await loadManagerCompanyRemote(membership.companyId);
      if (loaded && loaded.company.ownerId === options.uid) {
        const published = await publishManagerCompany(loaded.company, options.uid);
        if (published) {
          if (options.email) saveOwnerEmail(options.email, published.id);
          saveMembership(membership);
          activateManager(published, options.uid);
          return { role: "ADMIN" };
        }
      }
    }

    if (
      membership &&
      membership.userId === options.uid &&
      membership.role === "EMPLOYEE"
    ) {
      const remote = await loadEmployeeCompanyRemote(
        membership.companyId,
        membership.employeeId,
      );
      const company =
        remote ??
        ({
          id: membership.companyId,
          ownerId: "",
          joinCode: "",
          companyName: "Your team",
          managerName: "",
          email: "",
          employeeCount: 1,
          shiftTemplates: [],
          employees: [],
          shifts: [],
          signups: [],
          hours: [],
          setupCompletedAt: new Date().toISOString(),
        } satisfies Company);
      activateEmployee(company, options.uid, membership.employeeId);
      return { role: "EMPLOYEE" };
    }

    if (!membership && options.role !== "EMPLOYEE") {
      let remoteId = await loadCompanyIdForOwnerRemote(options.uid);
      if (!remoteId) remoteId = await loadCompanyIdForEmailRemote(options.email);
      if (remoteId) {
        const loaded = await loadManagerCompanyRemote(remoteId);
        if (loaded && loaded.company.ownerId === options.uid) {
          const published = await publishManagerCompany(loaded.company, options.uid);
          if (published) {
            if (options.email) saveOwnerEmail(options.email, published.id);
            saveMembership({
              userId: options.uid,
              companyId: published.id,
              employeeId: `${published.id}_${options.uid}`,
              role: "ADMIN",
            });
            activateManager(published, options.uid);
            return { role: "ADMIN" };
          }
        }
      }
    }

    if (options.role === "EMPLOYEE") {
      stopWatch();
      setSession(null);
      applyCompany(null);
      return { role: null };
    }

    return { role: null };
  }

  if (!options.configured && ownerId && options.role !== "EMPLOYEE") {
    const activated = activateWorkspaceForOwner(ownerId, options.email);
    if (activated) return { role: null };
  }

  if (options.role === "EMPLOYEE" && options.uid) {
    const activated = activateWorkspaceForMember(options.uid);
    if (activated) return { role: null };
  }

  activateDemoWorkspace();
  return { role: null };
}

export async function joinCompanyWithCode(input: {
  userId: string;
  code: string;
  name: string;
  email: string;
}): Promise<{ ok: true; company: Company } | { ok: false; reason: string }> {
  const code = normalizeJoinCode(input.code);
  if (code.length < 10 || code.length > 12) {
    return { ok: false, reason: "Enter the 10-character code from your manager." };
  }

  if (canUseFirestore()) {
    try {
      const joined = await joinCompanyRemote(input);
      const remote = await loadEmployeeCompanyRemote(joined.companyId, joined.employeeId);
      const company: Company = remote ?? {
        id: joined.companyId,
        ownerId: "",
        joinCode: "",
        companyName: "Your team",
        managerName: "",
        email: "",
        employeeCount: 1,
        shiftTemplates: [],
        employees: [
          {
            id: joined.employeeId,
            name: input.name.trim() || "Employee",
            email: input.email.trim(),
            role: "EMPLOYEE",
            companyId: joined.companyId,
            authUid: input.userId,
            createdAt: new Date().toISOString(),
          },
        ],
        shifts: [],
        signups: [],
        hours: [],
        setupCompletedAt: new Date().toISOString(),
      };
      activateEmployee(company, input.userId, joined.employeeId);
      return { ok: true, company: getActiveCompany() ?? company };
    } catch (error) {
      if (error instanceof JoinFailed) return { ok: false, reason: error.message };
      return {
        ok: false,
        reason: "Could not join right now. Check your connection and try again.",
      };
    }
  }

  const companyId = getCompanyIdForJoinCode(code);
  const company = companyId ? getCompanyById(companyId) : null;
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
  const saved = saveCompanyLocal(attached.company);
  saveMembership({
    userId: input.userId,
    companyId: saved.id,
    employeeId: attached.employee.id,
    role: "EMPLOYEE",
  });
  activateEmployee(saved, input.userId, attached.employee.id);
  return { ok: true, company: getActiveCompany() ?? saved };
}
