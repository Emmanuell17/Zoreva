import { calendarDayKey } from "@/lib/shift-utils";
import { shiftsOverlap } from "@/lib/time/interval";
import type { Shift, ShiftSignup } from "@/types";

export type RotaAudience = "manager" | "employee";

export type ShiftCoverage = {
  filled: number;
  open: number;
  headcount: number;
  unassigned: boolean;
};

export type WeekCoverage = {
  filled: number;
  open: number;
  headcount: number;
  unassigned: number;
};

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

export function addDaysToKey(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return calendarDayKey(date);
}

export function weekStartKey(value: string | Date = new Date()): string {
  const date = dateFromKey(calendarDayKey(value));
  date.setHours(12, 0, 0, 0);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayOffset);
  return calendarDayKey(date);
}

export function weekDayKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(weekStart, index));
}

export function previousWeekKey(weekStart: string): string {
  return addDaysToKey(weekStartKey(weekStart), -7);
}

export function nextWeekKey(weekStart: string): string {
  return addDaysToKey(weekStartKey(weekStart), 7);
}

export function formatShiftDay(value: string | Date): string {
  return dateFromKey(calendarDayKey(value)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatWeekRange(weekStart: string): string {
  const start = dateFromKey(weekStartKey(weekStart));
  const end = dateFromKey(addDaysToKey(weekStartKey(weekStart), 6));
  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString("en-US", {
    month: start.getMonth() === end.getMonth() ? undefined : "short",
    day: "numeric",
  });
  return `${startText} – ${endText}`;
}

export function isPublishedShift(shift: { status?: string | null }): boolean {
  return shift.status !== "draft";
}

export function visibleShifts<T extends { status?: string | null }>(
  shifts: T[],
  audience: RotaAudience,
): T[] {
  if (audience === "manager") return shifts;
  return shifts.filter((shift) => isPublishedShift(shift));
}

export function shiftsInWeek<T extends { date: string | Date }>(
  shifts: T[],
  weekStart: string,
): T[] {
  const start = weekStartKey(weekStart);
  return shifts.filter((shift) => weekStartKey(shift.date) === start);
}

export function peopleOnShift(
  shift: Pick<Shift, "id" | "assigneeIds">,
  signups: ShiftSignup[],
): string[] {
  const ids = new Set<string>();
  for (const employeeId of shift.assigneeIds ?? []) {
    if (employeeId) ids.add(employeeId);
  }
  for (const signup of signups) {
    if (signup.shiftId !== shift.id) continue;
    if (signup.status !== "SELECTED" && signup.status !== "CONFIRMED") continue;
    ids.add(signup.employeeId);
  }
  return [...ids];
}

export function coverageForShift(
  shift: Pick<Shift, "id" | "slots" | "assigneeIds">,
  signups: ShiftSignup[],
): ShiftCoverage {
  const headcount = Math.max(0, Math.trunc(shift.slots) || 0);
  const filled = Math.min(headcount, peopleOnShift(shift, signups).length);
  return {
    filled,
    open: Math.max(0, headcount - filled),
    headcount,
    unassigned: filled === 0,
  };
}

export function coverageForShifts(
  shifts: Array<Pick<Shift, "id" | "slots" | "assigneeIds">>,
  signups: ShiftSignup[],
): WeekCoverage {
  return shifts.reduce<WeekCoverage>(
    (total, shift) => {
      const coverage = coverageForShift(shift, signups);
      return {
        filled: total.filled + coverage.filled,
        open: total.open + coverage.open,
        headcount: total.headcount + coverage.headcount,
        unassigned: total.unassigned + (coverage.unassigned ? 1 : 0),
      };
    },
    { filled: 0, open: 0, headcount: 0, unassigned: 0 },
  );
}

export function assignmentBlockReason(
  employeeId: string,
  shift: Shift,
  shifts: Shift[],
  signups: ShiftSignup[],
): string | null {
  if (!employeeId) return "Choose a person from your team.";
  const assigned = shift.assigneeIds ?? [];
  if (assigned.includes(employeeId)) return null;
  if (peopleOnShift(shift, signups).length >= shift.slots) {
    return "This shift already has enough people.";
  }
  const target = {
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
  };
  const overlaps = shifts.some((other) => {
    if (other.id === shift.id) return false;
    if (
      !shiftsOverlap(target, {
        date: calendarDayKey(other.date),
        startTime: other.startTime,
        endTime: other.endTime,
      })
    ) {
      return false;
    }
    const onOther =
      (other.assigneeIds ?? []).includes(employeeId) ||
      signups.some(
        (signup) =>
          signup.shiftId === other.id &&
          signup.employeeId === employeeId &&
          (signup.status === "SELECTED" || signup.status === "CONFIRMED"),
      );
    return onOther;
  });
  if (overlaps) return "That person is already on another shift at this time.";
  return null;
}

export function duplicateWeek(input: {
  source: Shift[];
  targetWeek: string;
  existing?: Shift[];
  createId?: (index: number) => string;
}): { created: Shift[]; skipped: number } {
  const targetWeek = weekStartKey(input.targetWeek);
  const sourceWeek = previousWeekKey(targetWeek);
  const existing = input.existing ?? [];
  const taken = new Set(
    shiftsInWeek(existing, targetWeek).map(
      (shift) => `${calendarDayKey(shift.date)}|${shift.startTime}|${shift.endTime}`,
    ),
  );
  const created: Shift[] = [];
  let skipped = 0;

  for (const shift of input.source) {
    if (weekStartKey(shift.date) !== sourceWeek) continue;
    const date = addDaysToKey(calendarDayKey(shift.date), 7);
    const key = `${date}|${shift.startTime}|${shift.endTime}`;
    if (taken.has(key)) {
      skipped += 1;
      continue;
    }
    taken.add(key);
    created.push({
      id: input.createId?.(created.length) ?? `shift_copy_${targetWeek}_${created.length}`,
      date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      slots: shift.slots,
      label: shift.label ?? null,
      note: shift.note ?? null,
      positions: shift.positions?.length ? [...shift.positions] : null,
      assigneeIds: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });
  }

  return { created, skipped };
}

export function mergeRota(published: Shift[], drafts: Shift[]): Shift[] {
  const live = published
    .filter((shift) => shift.status !== "draft")
    .map((shift) => ({ ...shift, status: "published" as const }));
  const ids = new Set(live.map((shift) => shift.id));
  const pending = drafts
    .filter((shift) => shift.status === "draft" && shift.id && !ids.has(shift.id))
    .map((shift) => ({ ...shift, status: "draft" as const }));
  return [...live, ...pending];
}
