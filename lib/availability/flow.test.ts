import assert from "node:assert/strict";
import test from "node:test";
import { assignmentConflicts } from "@/lib/availability/conflicts";
import {
  prepareAvailabilityWindow,
  prepareTimeOffRequest,
  reviewTimeOffRequest,
  withAvailability,
  withTimeOff,
  type StaffingState,
} from "@/lib/availability/flow";
import { canEditOwnAvailability, canReviewTimeOff } from "@/lib/security/policy";
import { addCivilDays, shiftsOverlap } from "@/lib/time/interval";
import type { CompanyMembership, Shift } from "@/types";

const employee: CompanyMembership = {
  userId: "emp",
  companyId: "co1",
  employeeId: "co1_emp",
  role: "EMPLOYEE",
};

const manager: CompanyMembership = {
  userId: "owner",
  companyId: "co1",
  employeeId: "co1_owner",
  role: "ADMIN",
};

function shift(partial: Partial<Shift> & Pick<Shift, "id" | "date" | "startTime" | "endTime">): Shift {
  return { slots: 1, status: "published", assigneeIds: [], ...partial };
}

test("wall-clock overlap covers midnight, overnight, and the next calendar day", () => {
  assert.equal(
    shiftsOverlap(
      { date: "2026-10-26", startTime: "18:00", endTime: "00:00" },
      { date: "2026-10-26", startTime: "23:00", endTime: "23:30" },
    ),
    true,
  );
  assert.equal(
    shiftsOverlap(
      { date: "2026-10-26", startTime: "18:00", endTime: "00:00" },
      { date: "2026-10-27", startTime: "00:00", endTime: "04:00" },
    ),
    false,
  );
  assert.equal(
    shiftsOverlap(
      { date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { date: "2026-10-27", startTime: "01:00", endTime: "03:00" },
    ),
    true,
  );
  assert.equal(
    shiftsOverlap(
      { date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { date: "2026-10-27", startTime: "06:00", endTime: "10:00" },
    ),
    false,
  );
  assert.equal(
    shiftsOverlap(
      { date: "2026-10-26", startTime: "09:00", endTime: "12:00" },
      { date: "2026-10-26", startTime: "12:00", endTime: "16:00" },
    ),
    false,
  );
});

test("civil days stay continuous across daylight-saving boundaries", () => {
  assert.equal(addCivilDays("2026-03-07", 1), "2026-03-08");
  assert.equal(addCivilDays("2026-03-08", 1), "2026-03-09");
  assert.equal(addCivilDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addCivilDays("2026-11-01", 1), "2026-11-02");
  assert.equal(
    shiftsOverlap(
      { date: "2026-03-08", startTime: "01:30", endTime: "03:30" },
      { date: "2026-03-08", startTime: "02:00", endTime: "02:30" },
    ),
    true,
  );
});

test("an employee can submit availability and time off, then see the manager's decision", () => {
  const actor = { uid: "emp", membership: employee, ownerId: "owner" };
  assert.equal(canEditOwnAvailability(actor, "co1", "co1_emp"), true);
  assert.equal(canEditOwnAvailability(actor, "co1", "co1_other"), false);
  assert.equal(canReviewTimeOff(actor, "co1"), false);

  let state: StaffingState = { availability: [], timeOff: [] };
  const hours = prepareAvailabilityWindow({
    id: "hours",
    employeeId: "co1_emp",
    kind: "recurring",
    weekday: 1,
    date: null,
    startTime: "09:00",
    endTime: "17:00",
    available: true,
    updatedAt: "2026-10-20T00:00:00.000Z",
  });
  assert.equal(hours.ok, true);
  if (!hours.ok) return;
  state = withAvailability(state, hours.window);

  const request = prepareTimeOffRequest({
    id: "off",
    employeeId: "co1_emp",
    startDate: "2026-11-02",
    endDate: "2026-11-03",
    reason: "Appointment",
    createdAt: "2026-10-20T00:00:00.000Z",
  });
  assert.equal(request.ok, true);
  if (!request.ok) return;
  assert.equal(request.request.status, "pending");
  state = withTimeOff(state, request.request);
  assert.deepEqual(
    state.timeOff.filter((item) => item.employeeId === "co1_emp").map((item) => item.status),
    ["pending"],
  );

  const managerActor = { uid: "owner", membership: manager, ownerId: "owner" };
  assert.equal(canReviewTimeOff(managerActor, "co1"), true);
  assert.equal(canReviewTimeOff(managerActor, "co2"), false);
  assert.equal(canEditOwnAvailability(managerActor, "co1", "co1_owner"), false);

  const failed = reviewTimeOffRequest(state, "missing", "approved", "2026-10-21T00:00:00.000Z");
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  assert.equal(failed.state, state);

  const approved = reviewTimeOffRequest(state, "off", "approved", "2026-10-21T00:00:00.000Z");
  assert.equal(approved.ok, true);
  if (!approved.ok) return;
  assert.equal(approved.state.timeOff[0]?.status, "approved");

  const rejected = reviewTimeOffRequest(state, "off", "rejected", "2026-10-21T00:00:00.000Z");
  assert.equal(rejected.ok, true);
  if (!rejected.ok) return;
  assert.equal(rejected.state.timeOff[0]?.status, "rejected");
});

test("approved time off and declared unavailability block an assignment, including overnight time off", () => {
  const morning = shift({ id: "morning", date: "2026-10-27", startTime: "01:00", endTime: "03:00" });
  const request = prepareTimeOffRequest({
    id: "night",
    employeeId: "sam",
    startDate: "2026-10-26",
    endDate: "2026-10-26",
    startTime: "22:00",
    endTime: "02:00",
    createdAt: "2026-10-20T00:00:00.000Z",
  });
  assert.equal(request.ok, true);
  if (!request.ok) return;
  const pending = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    timeOff: [request.request],
  });
  assert.equal(pending.warnings[0]?.code, "pending-time-off");

  const decided = reviewTimeOffRequest(
    { availability: [], timeOff: [request.request] },
    "night",
    "approved",
    "2026-10-21T00:00:00.000Z",
  );
  assert.equal(decided.ok, true);
  if (!decided.ok) return;
  const blocked = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: morning,
    shifts: [morning],
    signups: [],
    timeOff: decided.state.timeOff,
    availability: [
      {
        id: "no",
        employeeId: "sam",
        kind: "date",
        weekday: null,
        date: "2026-10-28",
        startTime: "09:00",
        endTime: "12:00",
        available: false,
        updatedAt: "2026-10-20T00:00:00.000Z",
      },
    ],
  });
  assert.equal(blocked.blockers[0]?.code, "time-off");

  const later = shift({ id: "later", date: "2026-10-28", startTime: "10:00", endTime: "11:00" });
  const unavailable = assignmentConflicts({
    employeeId: "sam",
    employeeName: "Sam",
    shift: later,
    shifts: [later],
    signups: [],
    availability: [
      {
        id: "no",
        employeeId: "sam",
        kind: "date",
        weekday: null,
        date: "2026-10-28",
        startTime: "09:00",
        endTime: "12:00",
        available: false,
        updatedAt: "2026-10-20T00:00:00.000Z",
      },
    ],
  });
  assert.equal(unavailable.blockers[0]?.code, "unavailable");
});
