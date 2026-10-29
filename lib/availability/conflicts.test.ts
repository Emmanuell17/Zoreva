import assert from "node:assert/strict";
import test from "node:test";
import { assignmentConflicts } from "@/lib/availability/conflicts";
import { civilInterval, intervalsOverlap } from "@/lib/time/interval";
import type { AvailabilityWindow, Shift, TimeOffRequest } from "@/types";

function shift(partial: Partial<Shift> & Pick<Shift, "id" | "date" | "startTime" | "endTime">): Shift {
  return { slots: 2, status: "published", assigneeIds: [], ...partial };
}

function timeOff(partial: Partial<TimeOffRequest> & Pick<TimeOffRequest, "status">): TimeOffRequest {
  return {
    id: partial.id ?? "off",
    employeeId: "sam",
    startDate: "2026-10-26",
    endDate: "2026-10-26",
    startTime: null,
    endTime: null,
    createdAt: "2026-10-20T00:00:00.000Z",
    ...partial,
  };
}

function windowFor(partial: Partial<AvailabilityWindow>): AvailabilityWindow {
  return {
    id: partial.id ?? "avail",
    employeeId: "sam",
    kind: "recurring",
    weekday: 1,
    date: null,
    startTime: "09:00",
    endTime: "17:00",
    available: true,
    updatedAt: "2026-10-20T00:00:00.000Z",
    ...partial,
  };
}

test("an overnight shift overlaps the next morning and stops at the end time", () => {
  const night = civilInterval("2026-10-26", "22:00", "06:00");
  const early = civilInterval("2026-10-27", "01:00", "05:00");
  const later = civilInterval("2026-10-27", "06:00", "10:00");
  assert.ok(night && early && later);
  assert.equal(intervalsOverlap(night, early), true);
  assert.equal(intervalsOverlap(night, later), false);
});

test("overlapping shifts block assignment, including across midnight", () => {
  const night = shift({
    id: "night",
    date: "2026-10-26",
    startTime: "22:00",
    endTime: "06:00",
    assigneeIds: ["sam"],
  });
  const early = shift({
    id: "early",
    date: "2026-10-27",
    startTime: "01:00",
    endTime: "05:00",
  });
  const conflicts = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: early,
    shifts: [night, early],
    signups: [],
  });
  assert.equal(conflicts.blockers[0]?.reason, "That person is already on another shift at this time.");
  assert.equal(conflicts.warnings.length, 0);

  const later = shift({
    id: "later",
    date: "2026-10-27",
    startTime: "06:00",
    endTime: "10:00",
  });
  const clear = assignmentConflicts({
    employeeId: "sam",
    shift: later,
    shifts: [night, later],
    signups: [],
  });
  assert.equal(clear.blockers.length, 0);
});

test("approved time off blocks, pending time off warns, and rejected time off is ignored", () => {
  const morning = shift({ id: "morning", date: "2026-10-26", startTime: "09:00", endTime: "17:00" });
  const approved = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    timeOff: [timeOff({ status: "approved" })],
  });
  assert.equal(approved.blockers[0]?.code, "time-off");
  assert.match(approved.blockers[0]?.reason ?? "", /approved time off/);

  const pending = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    timeOff: [timeOff({ status: "pending" })],
  });
  assert.equal(pending.blockers.length, 0);
  assert.equal(pending.warnings[0]?.code, "pending-time-off");

  const rejected = assignmentConflicts({
    employeeId: "sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    timeOff: [timeOff({ status: "rejected" })],
  });
  assert.equal(rejected.blockers.length, 0);
  assert.equal(rejected.warnings.length, 0);
});

test("declared unavailability blocks and hours outside submitted availability warn", () => {
  const morning = shift({ id: "morning", date: "2026-10-26", startTime: "09:00", endTime: "17:00" });
  assert.equal(new Date(Date.UTC(2026, 9, 26)).getUTCDay(), 1);

  const unavailable = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    availability: [windowFor({ available: false, startTime: "12:00", endTime: "15:00" })],
  });
  assert.equal(unavailable.blockers[0]?.code, "unavailable");

  const outside = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    availability: [windowFor({ startTime: "10:00", endTime: "14:00" })],
  });
  assert.equal(outside.blockers.length, 0);
  assert.equal(outside.warnings[0]?.code, "outside-availability");

  const inside = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    availability: [windowFor({ startTime: "09:00", endTime: "17:00" })],
  });
  assert.equal(inside.warnings.length, 0);

  const undeclared = assignmentConflicts({
    employeeId: "sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    availability: [],
  });
  assert.equal(undeclared.warnings.length, 0);
});

test("availability rules can turn a blocker into a warning but cannot ignore an overlapping shift", () => {
  const morning = shift({ id: "morning", date: "2026-10-26", startTime: "09:00", endTime: "17:00" });
  const other = shift({
    id: "other",
    date: "2026-10-26",
    startTime: "12:00",
    endTime: "16:00",
    assigneeIds: ["sam"],
  });
  const result = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [other, morning],
    signups: [],
    timeOff: [timeOff({ status: "approved" })],
    rules: { approvedTimeOff: "warn", overlappingShift: "block" },
  });
  assert.equal(result.blockers.some((item) => item.code === "overlap"), true);
  assert.equal(result.blockers.some((item) => item.code === "time-off"), false);
  assert.equal(result.warnings.some((item) => item.code === "time-off"), true);
});
