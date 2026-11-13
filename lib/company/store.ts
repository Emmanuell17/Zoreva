import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import { CURRENT_EMPLOYEE_ID, usersSeed } from "@/lib/mocks/users";
import {
  CompanyReadError,
  JoinFailed,
  clearClosedCompanyLinksRemote,
  companyClosedForEmployeeRemote,
  deleteCompanyRemote,
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
  updateRosterNameRemote,
  watchEmployeeWorkspace,
  watchManagerWorkspace,
} from "@/lib/company/cloud";
import { attachAuthEmployee } from "@/lib/company/membership";
import {
  findLocalCompanyForManager,
  forgetCompanyLocal,
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
  AvailabilityWindow,
  Company,
  CompanySetupInput,
  HoursEntry,
  Role,
  Shift,
  ShiftSignup,
  TimeOffRequest,
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
let workspaceError: string | null = null;
let watchFailed = false;
let lastHydrate: {
  role: Role | null;
  uid?: string | null;
  email?: string | null;
  configured: boolean;
} | null = null;

function reportWorkspaceError(message: string) {
  watchFailed = true;
  if (workspaceError === message) return;
  workspaceError = message;
  notify();
}

function clearWorkspaceError() {
  watchFailed = false;
  if (!workspaceError) return;
  workspaceError = null;
  notify();
}

export function getWorkspaceError(): string | null {
  return workspaceError;
}

export async function retryWorkspaceLoad(): Promise<void> {
  watchFailed = false;
  workspaceError = null;
  notify();
  if (lastHydrate) {
    await hydrateWorkspace(lastHydrate);
    return;
  }
  if (session) startWatch(session.companyId);
}

async function readRemote<T>(
  work: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    if (error instanceof CompanyReadError) {
      reportWorkspaceError(error.message);
      return { ok: false };
    }
    throw error;
  }
}

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
  if (watchFailed || applyingSchedule) return;
  if (!activeCompany || activeCompany.id !== company.id || !session) return;
  clearWorkspaceError();
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
        ? watchManagerWorkspace(companyId, acceptRemoteCompany, reportWorkspaceError)
        : watchEmployeeWorkspace(
            companyId,
            session.employeeId,
            acceptRemoteCompany,
            reportWorkspaceError,
          );
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

export function updateStaffing(staffing: {
  availability: AvailabilityWindow[];
  timeOff: TimeOffRequest[];
}) {
  if (!activeCompany) return;
  activeCompany = saveCompanyLocal({
    ...activeCompany,
    availability: staffing.availability,
    timeOff: staffing.timeOff,
  });
  notify();
}

export function getCurrentEmployeeId(): string {
  return currentEmployeeId;
}

export function getBookingSession(): {
  uid: string;
  role: Role;
  companyId: string;
  employeeId: string;
} | null {
  return session ? { ...session } : null;
}

export function getActiveEmployees(): User[] {
  if (activeCompany) {
    return activeCompany.employees.map((employee) => ({ ...employee }));
  }
  return usersSeed.map((user) => ({ ...user }));
}

export const MAX_NAME_LENGTH = 80;

export async function updateOwnName(
  name: string,
): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, reason: "Enter your name." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: `Keep your name under ${MAX_NAME_LENGTH} characters.` };
  }
  const company = activeCompany;
  if (!company) return { ok: false, reason: "Join a company first." };
  const employeeId = currentEmployeeId;
  if (!company.employees.some((employee) => employee.id === employeeId)) {
    return { ok: false, reason: "Your profile was not found. Sign out and back in." };
  }

  if (canUseFirestore() && session) {
    if (session.role !== "EMPLOYEE" || session.employeeId !== employeeId) {
      return { ok: false, reason: "Only employees can change their name here." };
    }
    try {
      await updateRosterNameRemote(session.companyId, employeeId, trimmed);
    } catch {
      return { ok: false, reason: "Could not save your name. Check your connection and try again." };
    }
  }

  if (activeCompany?.id === company.id) {
    activeCompany = saveCompanyLocal({
      ...activeCompany,
      employees: activeCompany.employees.map((employee) =>
        employee.id === employeeId ? { ...employee, name: trimmed } : employee,
      ),
    });
    notify();
  }
  return { ok: true, name: trimmed };
}

export function registerScheduleBridge(bridge: ScheduleBridge) {
  scheduleBridge = bridge;
}

export async function persistActiveSchedule(state: ScheduleState): Promise<void> {
  if (applyingSchedule || !activeCompany) return;

  const previous = activeCompany;
  const next: Company = {
    ...activeCompany,
    shifts: state.shifts.map((shift) => ({ ...shift })),
    signups: state.signups.map((signup) => ({ ...signup })),
    hours: state.hours.map((entry) => ({ ...entry })),
  };
  if (session && session.companyId === next.id && canUseFirestore()) {
    if (session.role === "ADMIN") {
      await updatePublishedScheduleRemote(next);
    } else {
      await syncEmployeeActivityRemote(session.companyId, session.employeeId, previous, next);
    }
  }
  if (activeCompany?.id === next.id) {
    activeCompany = saveCompanyLocal(next);
  }
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

export async function deleteActiveCompany(input: {
  confirmName: string;
  authEmail?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const company = activeCompany;
  if (!company) return { ok: false, reason: "There is no company open to delete." };
  if (input.confirmName.trim() !== company.companyName.trim()) {
    return { ok: false, reason: "Type the company name exactly as shown to confirm." };
  }
  if (canUseFirestore()) {
    if (
      !session ||
      session.role !== "ADMIN" ||
      session.companyId !== company.id ||
      company.ownerId !== session.uid
    ) {
      return { ok: false, reason: "Only the manager who owns this company can delete it." };
    }
    stopWatch();
    try {
      await deleteCompanyRemote({
        companyId: company.id,
        ownerId: session.uid,
        joinCode: company.joinCode,
        authEmail: input.authEmail,
      });
    } catch {
      startWatch(company.id);
      return {
        ok: false,
        reason:
          "Could not finish deleting the company. Some records may already be removed. Check your connection and try again to finish.",
      };
    }
  }
  forgetCompanyLocal(company.id);
  stopWatch();
  setSession(null);
  activeCompany = null;
  applyCompany(null);
  return { ok: true };
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
    lastHydrate = options;
    const membershipRead = await readRemote(() => loadMembershipRemote(options.uid));
    if (!membershipRead.ok) return { role: options.role };
    let membership = membershipRead.value;
    if (
      membership &&
      membership.userId === options.uid &&
      membership.role === "ADMIN"
    ) {
      const adminMembership = membership;
      const loadedRead = await readRemote(() =>
        loadManagerCompanyRemote(adminMembership.companyId),
      );
      if (!loadedRead.ok) return { role: "ADMIN" };
      const loaded = loadedRead.value;
      if (!loaded && (await clearClosedCompanyLinksRemote(options.uid, options.email))) {
        forgetCompanyLocal(adminMembership.companyId);
        membership = null;
      }
      if (loaded && loaded.company.ownerId === options.uid) {
        let published: Company | null = null;
        try {
          published = await publishManagerCompany(loaded.company, options.uid);
        } catch (error) {
          if (error instanceof CompanyReadError) {
            reportWorkspaceError(error.message);
            return { role: "ADMIN" };
          }
          throw error;
        }
        if (published) {
          if (options.email) saveOwnerEmail(options.email, published.id);
          saveMembership(adminMembership);
          clearWorkspaceError();
          activateManager(published, options.uid);
          return { role: "ADMIN" };
        }
      }
    }

    if (membership && membership.userId === options.uid && membership.role === "EMPLOYEE") {
      const employeeCompanyId = membership.companyId;
      const closedRead = await readRemote(() =>
        companyClosedForEmployeeRemote(employeeCompanyId),
      );
      if (!closedRead.ok) return { role: "EMPLOYEE" };
      if (closedRead.value && (await clearClosedCompanyLinksRemote(options.uid, options.email))) {
        forgetCompanyLocal(membership.companyId);
        membership = null;
      }
    }

    if (
      membership &&
      membership.userId === options.uid &&
      membership.role === "EMPLOYEE"
    ) {
      const employeeMembership = membership;
      const remoteRead = await readRemote(() =>
        loadEmployeeCompanyRemote(employeeMembership.companyId, employeeMembership.employeeId),
      );
      if (!remoteRead.ok) return { role: "EMPLOYEE" };
      if (!remoteRead.value) {
        reportWorkspaceError("Could not load your company. Check your connection and try again.");
        return { role: "EMPLOYEE" };
      }
      clearWorkspaceError();
      activateEmployee(remoteRead.value, options.uid, employeeMembership.employeeId);
      return { role: "EMPLOYEE" };
    }

    if (!membership && options.role !== "EMPLOYEE") {
      const ownerRead = await readRemote(() => loadCompanyIdForOwnerRemote(options.uid));
      if (!ownerRead.ok) return { role: options.role };
      let remoteId = ownerRead.value;
      if (!remoteId) {
        const emailRead = await readRemote(() => loadCompanyIdForEmailRemote(options.email));
        if (!emailRead.ok) return { role: options.role };
        remoteId = emailRead.value;
      }
      if (remoteId) {
        const loadedRead = await readRemote(() => loadManagerCompanyRemote(remoteId));
        if (!loadedRead.ok) return { role: options.role };
        const loaded = loadedRead.value;
        if (!loaded) await clearClosedCompanyLinksRemote(options.uid, options.email);
        if (loaded && loaded.company.ownerId === options.uid) {
          let published: Company | null = null;
          try {
            published = await publishManagerCompany(loaded.company, options.uid);
          } catch (error) {
            if (error instanceof CompanyReadError) {
              reportWorkspaceError(error.message);
              return { role: "ADMIN" };
            }
            throw error;
          }
          if (published) {
            if (options.email) saveOwnerEmail(options.email, published.id);
            saveMembership({
              userId: options.uid,
              companyId: published.id,
              employeeId: `${published.id}_${options.uid}`,
              role: "ADMIN",
            });
            clearWorkspaceError();
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
      let remote: Company | null = null;
      try {
        remote = await loadEmployeeCompanyRemote(joined.companyId, joined.employeeId);
      } catch (error) {
        if (!(error instanceof CompanyReadError)) throw error;
        return { ok: false, reason: error.message };
      }
      if (!remote) {
        return {
          ok: false,
          reason: "Could not load your company. Check your connection and try again.",
        };
      }
      clearWorkspaceError();
      activateEmployee(remote, input.userId, joined.employeeId);
      return { ok: true, company: getActiveCompany() ?? remote };
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
