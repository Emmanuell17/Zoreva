import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import { usersSeed } from "@/lib/mocks/users";
import {
  hasCompletedSetup as readCompletedSetup,
  loadCompanyForOwner,
  saveCompany,
} from "@/lib/company/persistence";
import { buildCompanyWorkspace } from "@/lib/company/build-workspace";
import type { Company, CompanySetupInput, HoursEntry, Shift, ShiftSignup, User } from "@/types";

type ScheduleState = {
  shifts: Shift[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
};

type ScheduleBridge = {
  load: (state: ScheduleState) => void;
};

let activeCompany: Company | null = null;
let applyingSchedule = false;
let scheduleBridge: ScheduleBridge | null = null;

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

export function subscribeCompany(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveCompany(): Company | null {
  return activeCompany;
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

function applyCompany(company: Company | null) {
  activeCompany = company;
  applyingSchedule = true;
  scheduleBridge?.load(company ? {
    shifts: company.shifts.map((shift) => ({ ...shift })),
    signups: company.signups.map((signup) => ({ ...signup })),
    hours: company.hours.map((entry) => ({ ...entry })),
  } : demoSchedule());
  applyingSchedule = false;
  notify();
}

export function activateDemoWorkspace() {
  if (activeCompany === null && typeof window === "undefined") return;
  applyCompany(null);
}

export function activateWorkspaceForOwner(ownerId: string | null | undefined) {
  if (!ownerId) {
    applyCompany(null);
    return false;
  }

  const company = loadCompanyForOwner(ownerId);
  if (!company) {
    applyCompany(null);
    return false;
  }

  applyCompany(company);
  return true;
}

export function hasCompletedSetup(ownerId: string | null | undefined): boolean {
  return readCompletedSetup(ownerId);
}

export function createCompanyWorkspace(
  ownerId: string,
  input: CompanySetupInput,
): Company {
  const company = buildCompanyWorkspace(ownerId, input);
  saveCompany(company);
  applyCompany(company);
  return company;
}

export function ownerIdFromAuth(options: {
  uid?: string | null;
  configured: boolean;
}): string | null {
  if (options.uid) return options.uid;
  if (!options.configured) return "local-dev";
  return null;
}
