import assert from "node:assert/strict";
import test from "node:test";
import { isPastShift, isShiftCleared, prunePassedSchedule } from "@/lib/shift-utils";
import type { HoursEntry, Shift, ShiftSignup } from "@/types";

function shift(overrides: Partial<Shift> & Pick<Shift, "id" | "date" | "startTime" | "endTime">): Shift {
  return {
    slots: 1,
    ...overrides,
  };
}

function company(shifts: Shift[], timeZone: string) {
  const signups: ShiftSignup[] = shifts.map((item) => ({
    id: `signup-${item.id}`,
    shiftId: item.id,
    employeeId: "employee-1",
    status: "CONFIRMED",
    selectedAt: "2026-11-01T00:00:00.000Z",
  }));
  const hours: HoursEntry[] = shifts.map((item) => ({
    id: `hours-${item.id}`,
    shiftId: item.id,
    employeeId: "employee-1",
    startTime: item.startTime,
    endTime: item.endTime,
    status: "SUBMITTED",
    submittedAt: "2026-11-01T00:00:00.000Z",
  }));
  return { timezone: timeZone, shifts, signups, hours };
}

test("overnight shifts stay until their end, including across a company timezone boundary", () => {
  const overnight = shift({
    id: "overnight",
    date: "2026-11-12",
    startTime: "22:00",
    endTime: "06:00",
  });
  const losAngeles = "America/Los_Angeles";
  const stillWorking = new Date("2026-11-13T12:00:00.000Z");
  const endedSameCompanyDay = new Date("2026-11-13T15:00:00.000Z");
  const nextCompanyDay = new Date("2026-11-14T08:00:00.000Z");

  assert.equal(isPastShift(overnight, stillWorking, losAngeles), false);
  assert.equal(isShiftCleared(overnight, stillWorking, losAngeles), false);
  assert.equal(
    prunePassedSchedule(company([overnight], losAngeles), stillWorking)?.shifts.length,
    undefined,
  );

  assert.equal(isPastShift(overnight, endedSameCompanyDay, losAngeles), true);
  assert.equal(isShiftCleared(overnight, endedSameCompanyDay, losAngeles), false);
  assert.equal(
    prunePassedSchedule(company([overnight], losAngeles), endedSameCompanyDay),
    null,
  );

  assert.equal(isShiftCleared(overnight, nextCompanyDay, losAngeles), true);
  const pruned = prunePassedSchedule(company([overnight], losAngeles), nextCompanyDay);
  assert.deepEqual(pruned?.shifts, []);
  assert.deepEqual(pruned?.signups, []);
  assert.deepEqual(pruned?.hours, []);
});

test("a same-day shift stays through the company-local day it ends", () => {
  const dayShift = shift({
    id: "day",
    date: "2026-11-13",
    startTime: "09:00",
    endTime: "17:00",
  });
  const zone = "UTC";
  const afterEnd = new Date("2026-11-13T18:00:00.000Z");
  const nextDay = new Date("2026-11-14T00:00:00.000Z");

  assert.equal(isPastShift(dayShift, afterEnd, zone), true);
  assert.equal(isShiftCleared(dayShift, afterEnd, zone), false);
  assert.equal(prunePassedSchedule(company([dayShift], zone), afterEnd), null);
  assert.equal(isShiftCleared(dayShift, nextDay, zone), true);
});

test("cleanup keeps a shift that is still running when another shift on an earlier day is cleared", () => {
  const overnight = shift({
    id: "overnight",
    date: "2026-11-12",
    startTime: "22:00",
    endTime: "06:00",
  });
  const finished = shift({
    id: "finished",
    date: "2026-11-11",
    startTime: "09:00",
    endTime: "17:00",
  });
  const now = new Date("2026-11-13T05:00:00.000Z");
  const pruned = prunePassedSchedule(company([overnight, finished], "UTC"), now);

  assert.equal(isPastShift(overnight, now, "UTC"), false);
  assert.deepEqual(
    pruned?.shifts.map((item) => item.id),
    ["overnight"],
  );
  assert.deepEqual(
    pruned?.signups.map((item) => item.shiftId),
    ["overnight"],
  );
  assert.deepEqual(
    pruned?.hours.map((item) => item.shiftId),
    ["overnight"],
  );
});

test("Pacific/Auckland overnight shifts use the company day, not UTC midnight", () => {
  const overnight = shift({
    id: "auckland",
    date: "2026-11-12",
    startTime: "22:00",
    endTime: "06:00",
  });
  const beforeEnd = new Date("2026-11-12T16:00:00.000Z");
  assert.equal(isPastShift(overnight, beforeEnd, "Pacific/Auckland"), false);
  assert.equal(isShiftCleared(overnight, beforeEnd, "Pacific/Auckland"), false);
  assert.equal(prunePassedSchedule(company([overnight], "Pacific/Auckland"), beforeEnd), null);
});
