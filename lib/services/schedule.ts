import {
  assignEmployeeRemote,
  bookShiftRemote,
  cancelShiftRemote,
  confirmShiftRemote,
  releaseAssignmentRemote,
  syncShiftOpeningsRemote,
} from "@/lib/company/cloud";
import {
  getActiveCompany,
  getBookingSession,
  getCurrentEmployeeId,
  persistActiveSchedule,
  registerScheduleBridge,
} from "@/lib/company/store";
import { assignmentConflicts } from "@/lib/availability/conflicts";
import { getEmployeeName } from "@/lib/services/employees";
import { canUseFirestore } from "@/lib/firebase/firestore";
import {
  coverageForShift,
  duplicateWeek,
  isPublishedShift,
  weekStartKey,
} from "@/lib/rota/week";
import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import {
  decideBooking,
  decideCancellation,
  decideConfirmation,
  openingFromShift,
  signupDocumentId,
  type BookedSignup,
  type HeldShift,
  type ShiftWriteResult,
} from "@/lib/shifts/booking";
import {
  calendarDayKey,
  hoursForSignup,
  isPastShift,
  isSameShiftSlot,
  signupsForShift,
  sortShifts,
} from "@/lib/shift-utils";
import { shiftsOverlap } from "@/lib/time/interval";
import { DEFAULT_BUSINESS_TIMEZONE } from "@/lib/time/zoned";
import type { HoursEntry, Shift, ShiftSignup } from "@/types";

export type ScheduleSnapshot = {
  shifts: Shift[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
};

export type CreateShiftInput = {
  date: string | Date;
  startTime: string;
  endTime: string;
  slots: number;
  label?: string | null;
  note?: string | null;
  positions?: string[] | null;
};

export type SubmitHoursInput = {
  shiftId: string;
  employeeId?: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

let shifts: Shift[] = shiftsSeed.map((shift) => ({ ...shift }));
let signups: ShiftSignup[] = signupsSeed.map((signup) => ({ ...signup }));
let hours: HoursEntry[] = hoursSeed.map((entry) => ({ ...entry }));
let snapshot = buildSnapshot();

const HOLD_MS = 20_000;
const heldSignups = new Map<string, { signup: ShiftSignup; expires: number }>();
const heldRemovals = new Map<string, number>();

const listeners = new Set<() => void>();

function buildSnapshot(): ScheduleSnapshot {
  return {
    shifts: sortShifts(shifts),
    signups: signups.map((signup) => ({ ...signup })),
    hours: hours.map((entry) => ({ ...entry })),
  };
}

function notify() {
  snapshot = buildSnapshot();
  persistActiveSchedule(snapshot);
  listeners.forEach((listener) => listener());
}

function rememberSignup(signup: ShiftSignup) {
  heldRemovals.delete(signup.id);
  heldSignups.set(signup.id, {
    signup: { ...signup },
    expires: Date.now() + HOLD_MS,
  });
}

function rememberRemoval(id: string) {
  heldSignups.delete(id);
  heldRemovals.set(id, Date.now() + HOLD_MS);
}

function reconcileSignups(incoming: ShiftSignup[]): ShiftSignup[] {
  const now = Date.now();
  const removed = new Set<string>();
  for (const [id, expires] of heldRemovals) {
    if (expires <= now) heldRemovals.delete(id);
    else removed.add(id);
  }
  let next = incoming
    .filter((signup) => !removed.has(signup.id))
    .map((signup) => ({ ...signup }));

  for (const [id, held] of heldSignups) {
    if (held.expires <= now) {
      heldSignups.delete(id);
      continue;
    }
    const server = next.find((signup) => signup.id === id);
    if (!server) {
      next = [...next, { ...held.signup }];
      continue;
    }
    if (server.status === "CONFIRMED" || held.signup.status !== "CONFIRMED") {
      heldSignups.delete(id);
      continue;
    }
    next = next.map((signup) => (signup.id === id ? { ...held.signup } : signup));
  }
  return next;
}

function replaceSchedule(state: ScheduleSnapshot) {
  shifts = state.shifts.map((shift) => ({ ...shift }));
  signups = reconcileSignups(state.signups);
  hours = state.hours.map((entry) => ({ ...entry }));
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

function upsertSignup(signup: ShiftSignup) {
  const index = signups.findIndex((item) => item.id === signup.id);
  if (index === -1) {
    signups = [...signups, signup];
    return;
  }
  signups = signups.map((item, itemIndex) => (itemIndex === index ? signup : item));
}

function asSignup(signup: BookedSignup): ShiftSignup {
  return {
    id: signup.id,
    shiftId: signup.shiftId,
    employeeId: signup.employeeId,
    status: signup.status,
    selectedAt: signup.selectedAt,
    confirmedAt: signup.confirmedAt,
  };
}

function remoteActor(
  employeeId: string,
): { companyId: string; employeeId: string } | { error: string } | null {
  if (!canUseFirestore()) return null;
  const session = getBookingSession();
  if (!session || session.role !== "EMPLOYEE") {
    return { error: "Sign in as an employee before changing a shift." };
  }
  if (employeeId !== session.employeeId) {
    return { error: "You can only change your own shifts." };
  }
  return { companyId: session.companyId, employeeId: session.employeeId };
}

function localScope(employeeId: string) {
  const session = getBookingSession();
  const companyId = session?.companyId ?? "local";
  return {
    companyId,
    memberCompanyId: companyId,
    employeeId,
    memberEmployeeId: session?.employeeId ?? employeeId,
  };
}

function localHeld(employeeId: string): HeldShift[] {
  const held: HeldShift[] = [];
  for (const signup of signups) {
    if (signup.employeeId !== employeeId) continue;
    if (signup.status !== "SELECTED" && signup.status !== "CONFIRMED") continue;
    const shift = shifts.find((item) => item.id === signup.shiftId);
    if (!shift) continue;
    const opening = openingFromShift(shift, 0);
    held.push({
      shiftId: shift.id,
      date: opening.date,
      startTime: opening.startTime,
      endTime: opening.endTime,
    });
  }
  return held;
}

registerScheduleBridge({
  load: replaceSchedule,
});

export function subscribeSchedule(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getScheduleSnapshot(): ScheduleSnapshot {
  return snapshot;
}

export function getShiftById(
  shiftId: string,
  state: ScheduleSnapshot = snapshot,
): Shift | undefined {
  return state.shifts.find((shift) => shift.id === shiftId);
}

export function getSignupForShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
  state: ScheduleSnapshot = snapshot,
): ShiftSignup | undefined {
  return state.signups.find(
    (signup) => signup.shiftId === shiftId && signup.employeeId === employeeId,
  );
}

function employeeOverlapsAssignment(employeeId: string, shift: Shift): boolean {
  const target = {
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
  };
  return shifts.some((other) => {
    if (other.id === shift.id) return false;
    if (!(other.assigneeIds ?? []).includes(employeeId)) return false;
    return shiftsOverlap(target, {
      date: calendarDayKey(other.date),
      startTime: other.startTime,
      endTime: other.endTime,
    });
  });
}

function managerDenied(): { ok: false; reason: string } | null {
  if (!canUseFirestore()) return null;
  const session = getBookingSession();
  if (session?.role === "ADMIN") return null;
  return { ok: false, reason: "Only a manager can change the rota." };
}

export function createShifts(inputs: CreateShiftInput[]): Shift[] {
  if (managerDenied()) return [];
  const uniqueInputs: CreateShiftInput[] = [];

  for (const input of inputs) {
    const alreadyListed = uniqueInputs.some((item) => isSameShiftSlot(item, input));
    const alreadySaved = shifts.some((shift) => isSameShiftSlot(shift, input));
    if (alreadyListed || alreadySaved) continue;
    uniqueInputs.push(input);
  }

  if (uniqueInputs.length === 0) return [];

  const created = uniqueInputs.map((input, index) => ({
    id: `shift_${Date.now()}_${index}`,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    slots: input.slots,
    label: input.label?.trim() || null,
    note: input.note?.trim() || null,
    positions: input.positions?.length ? [...input.positions] : null,
    assigneeIds: [] as string[],
    status: "draft" as const,
    createdAt: new Date().toISOString(),
  }));

  shifts = [...shifts, ...created];
  notify();
  return created;
}

export function updateShift(
  shiftId: string,
  input: CreateShiftInput,
): { ok: true } | { ok: false; reason: string } {
  const denied = managerDenied();
  if (denied) return denied;
  const existing = getShiftById(shiftId);
  if (!existing) {
    return { ok: false, reason: "That shift is no longer available." };
  }
  if (isPastShift(existing, new Date(), businessZone())) {
    return { ok: false, reason: "This shift has already finished." };
  }

  const taken = coverageForShift(existing, signups).filled;
  if (input.slots < taken) {
    return {
      ok: false,
      reason: `${taken} ${taken === 1 ? "person is" : "people are"} already on this shift. Keep at least ${taken} spots.`,
    };
  }

  const duplicate = shifts.some(
    (shift) => shift.id !== shiftId && isSameShiftSlot(shift, input),
  );
  if (duplicate) {
    return {
      ok: false,
      reason: "That shift already exists for this day and time.",
    };
  }

  shifts = shifts.map((shift) => {
    if (shift.id !== shiftId) return shift;
    return {
      ...shift,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      slots: input.slots,
      label: input.label?.trim() || null,
      note: input.note?.trim() || null,
      positions: input.positions?.length ? [...input.positions] : null,
    };
  });
  notify();
  return { ok: true };
}

export function removeShift(
  shiftId: string,
): { ok: true } | { ok: false; reason: string } {
  const denied = managerDenied();
  if (denied) return denied;
  const shift = getShiftById(shiftId);
  if (!shift) return { ok: false, reason: "That shift is no longer available." };
  if (isPastShift(shift, new Date(), businessZone())) {
    return { ok: false, reason: "This shift has already finished." };
  }
  if (signupsForShift(signups, shiftId).length > 0) {
    return {
      ok: false,
      reason: "People have already chosen this shift, so it stays on the rota.",
    };
  }

  shifts = shifts.filter((item) => item.id !== shiftId);
  notify();
  return { ok: true };
}

function businessZone(): string {
  return getActiveCompany()?.timezone || DEFAULT_BUSINESS_TIMEZONE;
}

export async function assignEmployee(
  shiftId: string,
  employeeId: string,
  options?: { acknowledgeWarnings?: boolean },
): Promise<{ ok: true } | { ok: false; reason: string; level: "block" | "warn"; warnings: string[] }> {
  const denied = managerDenied();
  if (denied) return { ...denied, level: "block", warnings: [] };
  const shift = getShiftById(shiftId);
  if (!shift) {
    return { ok: false, level: "block", warnings: [], reason: "That shift is no longer available." };
  }
  if (isPastShift(shift, new Date(), businessZone())) {
    return { ok: false, level: "block", warnings: [], reason: "This shift has already finished." };
  }
  if ((shift.assigneeIds ?? []).includes(employeeId)) return { ok: true };
  const company = getActiveCompany();
  const conflicts = assignmentConflicts({
    employeeId,
    employeeName: getEmployeeName(employeeId),
    shift,
    shifts,
    signups,
    availability: company?.availability,
    timeOff: company?.timeOff,
    rules: company?.availabilityRules,
  });
  if (conflicts.blockers.length > 0) {
    return {
      ok: false,
      level: "block",
      warnings: [],
      reason: conflicts.blockers.map((item) => item.reason).join(" "),
    };
  }
  const warningText = conflicts.warnings.map((item) => item.reason);
  if (warningText.length > 0 && !options?.acknowledgeWarnings) {
    return {
      ok: false,
      level: "warn",
      warnings: warningText,
      reason: warningText.join(" "),
    };
  }
  if (shift.status !== "draft" && canUseFirestore()) {
    const company = getActiveCompany();
    const session = getBookingSession();
    if (company && session?.role === "ADMIN" && session.companyId === company.id) {
      const saved = await assignEmployeeRemote(company.id, employeeId, shift.id);
      if (!saved.ok) {
        return { ok: false, level: "block", warnings: [], reason: saved.reason };
      }
    }
  }
  shifts = shifts.map((item) =>
    item.id === shiftId
      ? { ...item, assigneeIds: [...(item.assigneeIds ?? []), employeeId] }
      : item,
  );
  notify();
  return { ok: true };
}

export async function unassignEmployee(
  shiftId: string,
  employeeId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const denied = managerDenied();
  if (denied) return denied;
  const shift = getShiftById(shiftId);
  if (!shift) return { ok: false, reason: "That shift is no longer available." };
  if (shift.status !== "draft" && canUseFirestore()) {
    const company = getActiveCompany();
    const session = getBookingSession();
    if (company && session?.role === "ADMIN" && session.companyId === company.id) {
      const saved = await releaseAssignmentRemote(company.id, employeeId, shift.id);
      if (!saved.ok) return saved;
    }
  }
  shifts = shifts.map((item) =>
    item.id === shiftId
      ? {
          ...item,
          assigneeIds: (item.assigneeIds ?? []).filter((id) => id !== employeeId),
        }
      : item,
  );
  notify();
  return { ok: true };
}

export async function publishWeek(
  weekStart: string,
): Promise<{ ok: true; published: number } | { ok: false; reason: string }> {
  const denied = managerDenied();
  if (denied) return denied;
  const start = weekStartKey(weekStart);
  const drafts = shifts.filter(
    (shift) => weekStartKey(shift.date) === start && shift.status === "draft",
  );
  if (drafts.length === 0) {
    return { ok: false, reason: "This week has no draft shifts to publish." };
  }
  if (canUseFirestore()) {
    const company = getActiveCompany();
    const session = getBookingSession();
    if (company && session?.role === "ADMIN" && session.companyId === company.id) {
      await syncShiftOpeningsRemote(company.id, drafts, signups, company.timezone);
      for (const shift of drafts) {
        for (const employeeId of shift.assigneeIds ?? []) {
          const saved = await assignEmployeeRemote(company.id, employeeId, shift.id);
          if (!saved.ok) return { ok: false, reason: saved.reason };
        }
      }
    }
  }
  let published = 0;
  shifts = shifts.map((shift) => {
    if (weekStartKey(shift.date) !== start || shift.status !== "draft") return shift;
    published += 1;
    return { ...shift, status: "published" };
  });
  if (published === 0) {
    return { ok: false, reason: "This week has no draft shifts to publish." };
  }
  notify();
  return { ok: true, published };
}

export function copyPreviousWeek(
  weekStart: string,
): { ok: true; created: number; skipped: number } | { ok: false; reason: string } {
  const denied = managerDenied();
  if (denied) return denied;
  const result = duplicateWeek({
    source: shifts,
    targetWeek: weekStart,
    existing: shifts,
    createId: (index) => `shift_${Date.now()}_${index}`,
  });
  if (result.created.length === 0) {
    return {
      ok: false,
      reason:
        result.skipped > 0
          ? "Those shifts are already on this week."
          : "Last week has no shifts to copy.",
    };
  }
  shifts = [...shifts, ...result.created];
  notify();
  return { ok: true, created: result.created.length, skipped: result.skipped };
}

function storedSignup(signup: ShiftSignup): BookedSignup {
  return {
    id: signup.id,
    shiftId: signup.shiftId,
    employeeId: signup.employeeId,
    status: signup.status,
    selectedAt: typeof signup.selectedAt === "string" ? signup.selectedAt : signup.selectedAt.toISOString(),
    confirmedAt:
      typeof signup.confirmedAt === "string"
        ? signup.confirmedAt
        : signup.confirmedAt instanceof Date
          ? signup.confirmedAt.toISOString()
          : null,
  };
}

function applySavedSignup(signup: ShiftSignup) {
  rememberSignup(signup);
  upsertSignup(signup);
  notify();
}

export async function selectShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): Promise<ShiftWriteResult> {
  const listed = getShiftById(shiftId);
  if (listed && !isPublishedShift(listed)) {
    return { ok: false, reason: "That shift is not published yet." };
  }
  if (listed?.assigneeIds?.includes(employeeId)) {
    return { ok: false, reason: "You're already planned for this shift." };
  }
  if (
    listed &&
    !getSignupForShift(shiftId, employeeId) &&
    coverageForShift(listed, signups).open <= 0
  ) {
    return { ok: false, reason: "This shift is full." };
  }
  if (listed && employeeOverlapsAssignment(employeeId, listed)) {
    return { ok: false, reason: "That overlaps a shift you're already on." };
  }
  if (listed) {
    const company = getActiveCompany();
    const conflicts = assignmentConflicts({
      employeeId,
      shift: listed,
      shifts,
      signups,
      availability: company?.availability,
      timeOff: company?.timeOff,
      rules: company?.availabilityRules,
    });
    const blocker = conflicts.blockers.find((item) => item.code !== "overlap");
    if (blocker) {
      return {
        ok: false,
        reason: blocker.reason
          .replace("This person has", "You have")
          .replace("This person asked", "You asked")
          .replace("This person said", "You said")
          .replace("This person did not", "You did not"),
      };
    }
  }
  const actor = remoteActor(employeeId);
  if (actor && "error" in actor) return { ok: false, reason: actor.error };
  if (actor) {
    const knownIds = signups
      .filter((signup) => signup.employeeId === actor.employeeId)
      .map((signup) => signup.id);
    const result = await bookShiftRemote(
      actor.companyId,
      actor.employeeId,
      shiftId,
      knownIds,
    );
    if (!result.ok) return result;
    if (result.signup) applySavedSignup(asSignup(result.signup));
    return result;
  }

  const shift = getShiftById(shiftId);
  if (!shift) return { ok: false, reason: "That shift is no longer available." };
  const session = getBookingSession();
  if (session && employeeId !== session.employeeId) {
    return { ok: false, reason: "You can only change your own shifts." };
  }
  const decision = decideBooking({
    ...localScope(employeeId),
    memberEmployeeId: employeeId,
    shiftId,
    now: Date.now(),
    opening: openingFromShift(shift, signupsForShift(signups, shiftId).length),
    signupExists: Boolean(getSignupForShift(shiftId, employeeId)),
    held: localHeld(employeeId).filter((item) => item.shiftId !== shiftId),
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };
  const existing = getSignupForShift(shiftId, employeeId);
  if (decision.alreadyBooked) {
    return { ok: true, alreadyBooked: true, signup: existing ? storedSignup(existing) : null };
  }
  const signup: ShiftSignup = {
    id: decision.signupId,
    shiftId,
    employeeId,
    status: "SELECTED",
    selectedAt: decision.selectedAt,
    confirmedAt: null,
  };
  applySavedSignup(signup);
  return { ok: true, signup: storedSignup(signup) };
}

export async function leaveShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): Promise<ShiftWriteResult> {
  const actor = remoteActor(employeeId);
  if (actor && "error" in actor) return { ok: false, reason: actor.error };
  if (actor) {
    const knownId = signups.find(
      (signup) => signup.shiftId === shiftId && signup.employeeId === actor.employeeId,
    )?.id;
    const result = await cancelShiftRemote(
      actor.companyId,
      actor.employeeId,
      shiftId,
      knownId,
    );
    if (!result.ok) return result;
    const stableId = signupDocumentId(employeeId, shiftId);
    if (stableId) rememberRemoval(stableId);
    for (const signup of signups) {
      if (signup.shiftId === shiftId && signup.employeeId === employeeId) {
        rememberRemoval(signup.id);
      }
    }
    signups = signups.filter(
      (signup) => signup.shiftId !== shiftId || signup.employeeId !== employeeId,
    );
    notify();
    return result;
  }

  const shift = getShiftById(shiftId);
  if (!shift) return { ok: false, reason: "That shift is no longer available." };
  const decision = decideCancellation({
    ...localScope(employeeId),
    memberEmployeeId: employeeId,
    shiftId,
    now: Date.now(),
    opening: openingFromShift(shift, signupsForShift(signups, shiftId).length),
    signupExists: Boolean(getSignupForShift(shiftId, employeeId)),
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };
  for (const signup of signups) {
    if (signup.shiftId === shiftId && signup.employeeId === employeeId) {
      rememberRemoval(signup.id);
    }
  }
  signups = signups.filter(
    (signup) => signup.shiftId !== shiftId || signup.employeeId !== employeeId,
  );
  if (!decision.alreadyCancelled) notify();
  return { ok: true, alreadyCancelled: decision.alreadyCancelled, signup: null };
}

export async function confirmShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): Promise<ShiftWriteResult> {
  const actor = remoteActor(employeeId);
  if (actor && "error" in actor) return { ok: false, reason: actor.error };
  if (actor) {
    const knownId = signups.find(
      (signup) => signup.shiftId === shiftId && signup.employeeId === actor.employeeId,
    )?.id;
    const result = await confirmShiftRemote(
      actor.companyId,
      actor.employeeId,
      shiftId,
      knownId,
    );
    if (!result.ok) return result;
    if (result.signup) applySavedSignup(asSignup(result.signup));
    return result;
  }

  const shift = getShiftById(shiftId);
  const existing = getSignupForShift(shiftId, employeeId);
  const decision = decideConfirmation({
    ...localScope(employeeId),
    memberEmployeeId: employeeId,
    now: Date.now(),
    opening: shift ? openingFromShift(shift, signupsForShift(signups, shiftId).length) : null,
    signup: existing ? storedSignup(existing) : null,
  });
  if (!decision.ok) return { ok: false, reason: decision.reason };
  if (!existing || decision.alreadyConfirmed) {
    return { ok: true, signup: existing ? storedSignup(existing) : null };
  }
  const confirmed: ShiftSignup = {
    ...existing,
    status: "CONFIRMED",
    confirmedAt: new Date().toISOString(),
  };
  applySavedSignup(confirmed);
  return { ok: true, signup: storedSignup(confirmed) };
}

export function submitHours(
  input: SubmitHoursInput,
): { ok: true } | { ok: false; reason: string } {
  const employeeId = input.employeeId ?? getCurrentEmployeeId();
  const shift = getShiftById(input.shiftId);
  if (!shift) return { ok: false, reason: "Shift not found." };
  if (!isPastShift(shift, new Date(), businessZone())) {
    return { ok: false, reason: "Enter hours after the shift ends." };
  }

  const signup = getSignupForShift(input.shiftId, employeeId);
  if (!signup) {
    return { ok: false, reason: "You were not on this shift." };
  }
  if (hoursForSignup(hours, input.shiftId, employeeId)) {
    return { ok: false, reason: "Hours already entered for this shift." };
  }

  const entry: HoursEntry = {
    id: `hours_${Date.now()}`,
    shiftId: input.shiftId,
    employeeId,
    startTime: input.startTime,
    endTime: input.endTime,
    note: input.note?.trim() || null,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
  };

  hours = [...hours, entry];
  notify();
  return { ok: true };
}
