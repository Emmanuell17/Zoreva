import { resolveAvailabilityRules, type AvailabilityRules } from "@/lib/availability/rules";
import { assignmentBlockReason } from "@/lib/rota/week";
import { calendarDayKey } from "@/lib/shift-utils";
import {
  civilInterval,
  intervalsOverlap,
  weekdayForDate,
  wholeDaysInterval,
  type CivilInterval,
} from "@/lib/time/interval";
import type { AvailabilityWindow, Shift, ShiftSignup, TimeOffRequest } from "@/types";

export type ScheduleConflict = {
  code: "overlap" | "time-off" | "pending-time-off" | "unavailable" | "outside-availability";
  level: "block" | "warn";
  reason: string;
};

function dateFromCivilDay(day: number): string {
  const utc = new Date(day * 86_400_000);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const date = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function shiftSpan(shift: Pick<Shift, "date" | "startTime" | "endTime">): CivilInterval | null {
  return civilInterval(calendarDayKey(shift.date), shift.startTime, shift.endTime);
}

function dayPortions(span: CivilInterval): Array<{ date: string; interval: CivilInterval }> {
  const portions: Array<{ date: string; interval: CivilInterval }> = [];
  let cursor = span.start;
  while (cursor < span.end) {
    const day = Math.floor(cursor / (24 * 60));
    const next = Math.min(span.end, (day + 1) * 24 * 60);
    portions.push({
      date: dateFromCivilDay(day),
      interval: { start: cursor, end: next },
    });
    cursor = next;
  }
  return portions;
}

function timeOffSpan(request: TimeOffRequest): CivilInterval | null {
  if (request.startDate === request.endDate && request.startTime && request.endTime) {
    return civilInterval(request.startDate, request.startTime, request.endTime);
  }
  return wholeDaysInterval(request.startDate, request.endDate);
}

function windowsForDay(
  windows: AvailabilityWindow[],
  employeeId: string,
  date: string,
): AvailabilityWindow[] {
  const own = windows.filter((window) => window.employeeId === employeeId && window.available);
  const dated = own.filter((window) => window.kind === "date" && window.date === date);
  if (dated.length > 0) return dated;
  const weekday = weekdayForDate(date);
  return own.filter((window) => window.kind === "recurring" && window.weekday === weekday);
}

function dayCovered(date: string, portion: CivilInterval, windows: AvailabilityWindow[]): boolean {
  const merged: CivilInterval[] = [];
  const spans = windows
    .map((window) => civilInterval(date, window.startTime, window.endTime))
    .filter((span): span is CivilInterval => Boolean(span))
    .sort((a, b) => a.start - b.start);
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (!last || span.start > last.end) merged.push({ ...span });
    else last.end = Math.max(last.end, span.end);
  }
  return merged.some((span) => span.start <= portion.start && span.end >= portion.end);
}

function unavailableOverlaps(
  windows: AvailabilityWindow[],
  employeeId: string,
  span: CivilInterval,
): boolean {
  return windows.some((window) => {
    if (window.employeeId !== employeeId || window.available) return false;
    if (window.kind === "date" && window.date) {
      const blocked = civilInterval(window.date, window.startTime, window.endTime);
      return Boolean(blocked && intervalsOverlap(span, blocked));
    }
    if (window.kind !== "recurring" || window.weekday === null) return false;
    return dayPortions(span).some((portion) => {
      if (weekdayForDate(portion.date) !== window.weekday) return false;
      const blocked = civilInterval(portion.date, window.startTime, window.endTime);
      return Boolean(blocked && intervalsOverlap(span, blocked));
    });
  });
}

export function assignmentConflicts(input: {
  employeeId: string;
  employeeName?: string;
  shift: Shift;
  shifts: Shift[];
  signups: ShiftSignup[];
  availability?: AvailabilityWindow[];
  timeOff?: TimeOffRequest[];
  rules?: Partial<AvailabilityRules> | null;
}): { blockers: ScheduleConflict[]; warnings: ScheduleConflict[] } {
  const rules = resolveAvailabilityRules(input.rules);
  const name = input.employeeName?.trim() || "This person";
  const blockers: ScheduleConflict[] = [];
  const warnings: ScheduleConflict[] = [];
  const push = (level: "block" | "warn" | "ignore", conflict: Omit<ScheduleConflict, "level">) => {
    if (level === "ignore") return;
    const item = { ...conflict, level };
    if (level === "block") blockers.push(item);
    else warnings.push(item);
  };

  const overlap = assignmentBlockReason(input.employeeId, input.shift, input.shifts, input.signups);
  if (overlap) push(rules.overlappingShift, { code: "overlap", reason: overlap });

  const span = shiftSpan(input.shift);
  if (!span) {
    blockers.push({
      code: "overlap",
      level: "block",
      reason: "Enter a valid start and end time before assigning someone.",
    });
    return { blockers, warnings };
  }

  for (const request of input.timeOff ?? []) {
    if (request.employeeId !== input.employeeId || request.status === "rejected") continue;
    const off = timeOffSpan(request);
    if (!off || !intervalsOverlap(span, off)) continue;
    if (request.status === "approved") {
      push(rules.approvedTimeOff, {
        code: "time-off",
        reason: `${name} has approved time off during this shift.`,
      });
    } else {
      push(rules.pendingTimeOff, {
        code: "pending-time-off",
        reason: `${name} asked for time off during this shift. It is still waiting for a decision.`,
      });
    }
  }

  if (unavailableOverlaps(input.availability ?? [], input.employeeId, span)) {
    push(rules.declaredUnavailable, {
      code: "unavailable",
      reason: `${name} said they cannot work at this time.`,
    });
  }

  const declared = (input.availability ?? []).some(
    (window) => window.employeeId === input.employeeId && window.available,
  );
  if (declared) {
    const covered = dayPortions(span).every((portion) =>
      dayCovered(
        portion.date,
        portion.interval,
        windowsForDay(input.availability ?? [], input.employeeId, portion.date),
      ),
    );
    if (!covered) {
      push(rules.outsideSubmittedAvailability, {
        code: "outside-availability",
        reason: `${name} did not say they can work these hours.`,
      });
    }
  }

  return { blockers, warnings };
}
