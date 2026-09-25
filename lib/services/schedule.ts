import { persistActiveSchedule, registerScheduleBridge } from "@/lib/company/store";
import { hoursSeed } from "@/lib/mocks/hours";
import { shiftsSeed } from "@/lib/mocks/shifts";
import { signupsSeed } from "@/lib/mocks/signups";
import { getCurrentEmployeeId } from "@/lib/company/store";
import {
  calendarDayKey,
  employeeHasOverlap,
  hoursForSignup,
  isPastShift,
  isSameShiftSlot,
  isUpcomingShift,
  remainingSlots,
  signupsForShift,
  sortShifts,
} from "@/lib/shift-utils";
import type { HoursEntry, HoursStatus, Shift, ShiftSignup } from "@/types";

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

function replaceSchedule(state: ScheduleSnapshot) {
  shifts = state.shifts.map((shift) => ({ ...shift }));
  signups = state.signups.map((signup) => ({ ...signup }));
  hours = state.hours.map((entry) => ({ ...entry }));
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
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

export function getUpcomingShifts(
  state: ScheduleSnapshot = snapshot,
): Shift[] {
  return state.shifts.filter((shift) => isUpcomingShift(shift));
}

export function getPastShifts(state: ScheduleSnapshot = snapshot): Shift[] {
  return sortShifts(state.shifts.filter((shift) => isPastShift(shift))).reverse();
}

export function getEmployeeSignups(
  employeeId: string = getCurrentEmployeeId(),
  state: ScheduleSnapshot = snapshot,
): ShiftSignup[] {
  return state.signups.filter((signup) => signup.employeeId === employeeId);
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

export function createShift(input: CreateShiftInput): Shift | undefined {
  return createShifts([input])[0];
}

export function createShifts(inputs: CreateShiftInput[]): Shift[] {
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
    createdAt: new Date().toISOString(),
  }));

  shifts = [...shifts, ...created];
  notify();
  return created;
}

function timeKey(value: string) {
  return value.slice(0, 5);
}

function slotKey(item: { date: string | Date; startTime: string; endTime: string }) {
  return `${calendarDayKey(item.date)}|${timeKey(item.startTime)}|${timeKey(item.endTime)}`;
}

export function keepOnlySelectedShiftsOnDays(
  dates: Array<string | Date>,
  keep: CreateShiftInput[],
): number {
  const dateKeys = new Set(dates.map((date) => calendarDayKey(date)));
  const keepSlots = new Set(keep.map(slotKey));
  const next = shifts.filter((shift) => {
    const day = calendarDayKey(shift.date);
    if (!dateKeys.has(day)) return true;
    if (signupsForShift(signups, shift.id).length > 0) return true;
    return keepSlots.has(slotKey(shift));
  });
  const removed = shifts.length - next.length;
  if (removed === 0) return 0;
  shifts = next;
  notify();
  return removed;
}

export function updateShift(
  shiftId: string,
  input: CreateShiftInput,
): { ok: true } | { ok: false; reason: string } {
  const existing = getShiftById(shiftId);
  if (!existing) {
    return { ok: false, reason: "That shift is no longer available." };
  }
  if (isPastShift(existing)) {
    return { ok: false, reason: "This shift has already finished." };
  }

  const taken = signupsForShift(signups, shiftId).length;
  if (input.slots < taken) {
    return {
      ok: false,
      reason: `${taken} ${taken === 1 ? "person has" : "people have"} already chosen this shift. Keep at least ${taken} spots.`,
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

export function removeShift(shiftId: string): boolean {
  const shift = getShiftById(shiftId);
  if (!shift || isPastShift(shift)) return false;
  if (signupsForShift(signups, shiftId).length > 0) return false;

  shifts = shifts.filter((item) => item.id !== shiftId);
  notify();
  return true;
}

export function selectShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): { ok: true } | { ok: false; reason: string } {
  const shift = getShiftById(shiftId);
  if (!shift) return { ok: false, reason: "That shift is no longer available." };
  if (isPastShift(shift)) {
    return { ok: false, reason: "This shift has already finished." };
  }
  if (getSignupForShift(shiftId, employeeId)) {
    return { ok: false, reason: "You already chose this shift." };
  }
  if (remainingSlots(shift, signups) <= 0) {
    return { ok: false, reason: "This shift is full." };
  }
  if (employeeHasOverlap(employeeId, shift, shifts, signups)) {
    return { ok: false, reason: "This overlaps another shift you already chose." };
  }

  const signup: ShiftSignup = {
    id: `signup_${Date.now()}`,
    shiftId,
    employeeId,
    status: "SELECTED",
    selectedAt: new Date().toISOString(),
  };

  signups = [...signups, signup];
  notify();
  return { ok: true };
}

export function leaveShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): boolean {
  const shift = getShiftById(shiftId);
  if (!shift || isPastShift(shift)) return false;

  const existing = getSignupForShift(shiftId, employeeId);
  if (!existing) return false;

  signups = signups.filter((signup) => signup.id !== existing.id);
  notify();
  return true;
}

export function confirmShift(
  shiftId: string,
  employeeId: string = getCurrentEmployeeId(),
): boolean {
  const shift = getShiftById(shiftId);
  if (!shift || isPastShift(shift)) return false;

  let updated = false;
  signups = signups.map((signup) => {
    if (signup.shiftId !== shiftId || signup.employeeId !== employeeId) {
      return signup;
    }
    updated = true;
    return {
      ...signup,
      status: "CONFIRMED",
      confirmedAt: new Date().toISOString(),
    };
  });

  if (updated) notify();
  return updated;
}

export function submitHours(
  input: SubmitHoursInput,
): { ok: true } | { ok: false; reason: string } {
  const employeeId = input.employeeId ?? getCurrentEmployeeId();
  const shift = getShiftById(input.shiftId);
  if (!shift) return { ok: false, reason: "Shift not found." };
  if (!isPastShift(shift)) {
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

export function reviewHours(
  hoursId: string,
  status: Extract<HoursStatus, "APPROVED" | "CHECK_PAPER">,
): boolean {
  let updated = false;
  if (updated) notify();
  return updated;
}

export function approveMatchingHours(): number {
  let count = 0;
  const reviewedAt = new Date().toISOString();

  hours = hours.map((entry) => {
    if (entry.status !== "SUBMITTED") return entry;
    const shift = shifts.find((item) => item.id === entry.shiftId);
    if (
      !shift ||
      entry.startTime !== shift.startTime ||
      entry.endTime !== shift.endTime
    ) {
      return entry;
    }
    count += 1;
    return {
      ...entry,
      status: "APPROVED",
      reviewedAt,
    };
  });

  if (count) notify();
  return count;
}
