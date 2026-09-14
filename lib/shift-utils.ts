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
  const date = toDate(shift.date);
  const [hours, minutes] = (which === "start" ? shift.startTime : shift.endTime)
    .split(":")
    .map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

export function isUpcomingShift(shift: Shift, now = new Date()): boolean {
  return startOfDay(toDate(shift.date)) >= startOfDay(now);
}

export function isTodayShift(shift: Shift, now = new Date()): boolean {
  return startOfDay(toDate(shift.date)).getTime() === startOfDay(now).getTime();
}

export function isPastShift(shift: Shift, now = new Date()): boolean {
  return shiftDateTime(shift, "end") <= now;
}

export function hoursBetween(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const start = (startHours || 0) * 60 + (startMinutes || 0);
  const end = (endHours || 0) * 60 + (endMinutes || 0);
  return Math.max(0, (end - start) / 60);
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
  const mine = activeSignups(signups).filter(
    (signup) => signup.employeeId === employeeId,
  );

  return mine.some((signup) => {
    const other = shifts.find((item) => item.id === signup.shiftId);
    if (!other || other.id === shift.id) return false;
    return (
      sameShiftDay(shift, other) &&
      timesOverlap(shift.startTime, shift.endTime, other.startTime, other.endTime)
    );
  });
}
