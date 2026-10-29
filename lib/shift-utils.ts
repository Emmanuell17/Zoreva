import { clockMinutes, shiftsOverlap } from "@/lib/time/interval";
import { DEFAULT_BUSINESS_TIMEZONE, shiftEndUtc } from "@/lib/time/zoned";
import type { HoursEntry, Shift, ShiftSignup } from "@/types";

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function startOfDay(value: Date = new Date()): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function calendarDayKey(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = startOfDay(toDate(value));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameShiftSlot(
  a: { date: string | Date; startTime: string; endTime: string },
  b: { date: string | Date; startTime: string; endTime: string },
): boolean {
  return (
    calendarDayKey(a.date) === calendarDayKey(b.date) &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  );
}

export function shiftDateTime(shift: Pick<Shift, "date" | "startTime" | "endTime">, which: "start" | "end"): Date {
  const key = calendarDayKey(shift.date);
  const [year, month, day] = key.split("-").map(Number);
  const clock = which === "start" ? shift.startTime : shift.endTime;
  const minutes = clockMinutes(clock) ?? 0;
  const date = new Date(year || 1970, (month || 1) - 1, day || 1, Math.floor(minutes / 60), minutes % 60, 0, 0);
  const start = clockMinutes(shift.startTime);
  const end = clockMinutes(shift.endTime);
  if (which === "end" && start !== null && end !== null && end <= start) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function isShiftDatePassed(
  date: string | Date,
  now = new Date(),
): boolean {
  return calendarDayKey(date) < calendarDayKey(now);
}

export function isUpcomingShift(shift: Shift, now = new Date()): boolean {
  return !isPastShift(shift, now);
}

export function isPastShift(
  shift: Shift,
  now = new Date(),
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): boolean {
  const instant = shiftEndUtc(
    calendarDayKey(shift.date),
    shift.startTime,
    shift.endTime,
    timeZone,
  );
  if (instant === null) return shiftDateTime(shift, "end") <= now;
  return instant <= now.getTime();
}

export function hoursBetween(startTime: string, endTime: string): number {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  if (start === null || end === null) return 0;
  const span = end > start ? end - start : end < start ? end + 24 * 60 - start : 0;
  return span / 60;
}

export function formatHourCount(hours: number): string {
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${rounded} ${hours === 1 ? "hour" : "hours"}`;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}

export function sameShiftDay(a: Shift, b: Shift): boolean {
  return startOfDay(toDate(a.date)).getTime() === startOfDay(toDate(b.date)).getTime();
}

export function sortShifts(shifts: Shift[]): Shift[] {
  return [...shifts].sort(
    (a, b) =>
      toDate(a.date).getTime() - toDate(b.date).getTime() ||
      a.startTime.localeCompare(b.startTime),
  );
}

export function activeSignups(signups: ShiftSignup[]): ShiftSignup[] {
  return signups.filter(
    (signup) => signup.status === "SELECTED" || signup.status === "CONFIRMED",
  );
}

export function signupsForShift(
  signups: ShiftSignup[],
  shiftId: string,
): ShiftSignup[] {
  return activeSignups(signups).filter((signup) => signup.shiftId === shiftId);
}

export function remainingSlots(shift: Shift, signups: ShiftSignup[]): number {
  return Math.max(0, shift.slots - signupsForShift(signups, shift.id).length);
}

export function hoursForSignup(
  hours: HoursEntry[],
  shiftId: string,
  employeeId: string,
): HoursEntry | undefined {
  return hours.find(
    (entry) => entry.shiftId === shiftId && entry.employeeId === employeeId,
  );
}

export function employeeHasOverlap(
  employeeId: string,
  shift: Shift,
  shifts: Shift[],
  signups: ShiftSignup[],
): boolean {
  const target = {
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
  };
  const assigned = shifts.some((other) => {
    if (other.id === shift.id) return false;
    if (!(other.assigneeIds ?? []).includes(employeeId)) return false;
    return shiftsOverlap(target, {
      date: calendarDayKey(other.date),
      startTime: other.startTime,
      endTime: other.endTime,
    });
  });
  if (assigned) return true;

  const mine = activeSignups(signups).filter(
    (signup) => signup.employeeId === employeeId,
  );

  return mine.some((signup) => {
    const other = shifts.find((item) => item.id === signup.shiftId);
    if (!other || other.id === shift.id) return false;
    return shiftsOverlap(target, {
      date: calendarDayKey(other.date),
      startTime: other.startTime,
      endTime: other.endTime,
    });
  });
}
