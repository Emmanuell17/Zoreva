import assert from "node:assert/strict";
import test from "node:test";
import { validateTimeRange } from "@/lib/validation";
import {
  addDaysToKey,
  assignmentBlockReason,
  coverageForShift,
  coverageForShifts,
  duplicateWeek,
  isPublishedShift,
  mergeRota,
  shiftsInWeek,
  visibleShifts,
  weekDayKeys,
  weekStartKey,
} from "@/lib/rota/week";
import type { Shift, ShiftSignup } from "@/types";

function shift(partial: Partial<Shift> & Pick<Shift, "id" | "date">): Shift {
  return {
    startTime: "09:00",
    endTime: "17:00",
    slots: 2,
    status: "published",
    assigneeIds: [],
    ...partial,
  };
}

test("a week starts on Monday and stays inside that Monday-Sunday range", () => {
  assert.equal(weekStartKey("2026-10-26"), "2026-10-26");
  assert.equal(weekStartKey("2026-10-25"), "2026-10-19");
  assert.equal(weekStartKey("2026-11-01"), "2026-10-26");
  assert.equal(weekStartKey("2026-11-02"), "2026-11-02");
  assert.deepEqual(weekDayKeys("2026-10-26"), [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
  const week = [
    shift({ id: "mon", date: "2026-10-26" }),
    shift({ id: "sun", date: "2026-11-01" }),
    shift({ id: "next", date: "2026-11-02" }),
  ];
  assert.deepEqual(
    shiftsInWeek(week, "2026-10-28").map((item) => item.id),
    ["mon", "sun"],
  );
});

test("employees see the published rota and managers also see drafts", () => {
  const shifts = [
    shift({ id: "live", date: "2026-10-26", status: "published" }),
    shift({ id: "old", date: "2026-10-27" }),
    shift({ id: "plan", date: "2026-10-28", status: "draft" }),
  ];
  delete shifts[1].status;
  assert.equal(isPublishedShift(shifts[1]), true);
  assert.deepEqual(
    visibleShifts(shifts, "employee").map((item) => item.id),
    ["live", "old"],
  );
  assert.equal(visibleShifts(shifts, "manager").length, 3);
  const merged = mergeRota(
    [shifts[0], shifts[2]],
    [shift({ id: "only-draft", date: "2026-10-29", status: "draft" })],
  );
  assert.deepEqual(
    merged.map((item) => [item.id, item.status]),
    [
      ["live", "published"],
      ["only-draft", "draft"],
    ],
  );
});

test("coverage counts filled spots, open spots, and shifts with nobody", () => {
  const morning = shift({
    id: "morning",
    date: "2026-10-26",
    slots: 3,
    assigneeIds: ["sam", "sam"],
  });
  const empty = shift({ id: "empty", date: "2026-10-26", slots: 1, assigneeIds: [] });
  const signups: ShiftSignup[] = [
    {
      id: "s1",
      shiftId: "morning",
      employeeId: "jo",
      status: "SELECTED",
      selectedAt: "2026-10-26T00:00:00.000Z",
    },
  ];
  assert.deepEqual(coverageForShift(morning, signups), {
    filled: 2,
    open: 1,
    headcount: 3,
    unassigned: false,
  });
  assert.deepEqual(coverageForShifts([morning, empty], signups), {
    filled: 2,
    open: 2,
    headcount: 4,
    unassigned: 1,
  });
});

test("copying a week creates new draft shifts and leaves assignments behind", () => {
  const source = [
    shift({
      id: "old",
      date: "2026-10-19",
      assigneeIds: ["sam"],
      label: "Morning",
      positions: ["Barista"],
    }),
    shift({ id: "duplicate", date: "2026-10-19", startTime: "09:00", endTime: "17:00" }),
    shift({ id: "outside", date: "2026-10-12" }),
  ];
  const first = duplicateWeek({
    source,
    targetWeek: "2026-10-26",
    existing: [shift({ id: "already", date: "2026-10-27", startTime: "14:00", endTime: "22:00" })],
    createId: (index) => `new_${index}`,
  });
  assert.equal(first.created.length, 1);
  assert.equal(first.skipped, 1);
  assert.equal(first.created[0]?.id, "new_0");
  assert.equal(first.created[0]?.date, "2026-10-26");
  assert.equal(first.created[0]?.status, "draft");
  assert.deepEqual(first.created[0]?.assigneeIds, []);
  assert.equal(first.created[0]?.label, "Morning");
  assert.deepEqual(first.created[0]?.positions, ["Barista"]);
  assert.equal(first.created.some((item) => item.id === "old"), false);

  const second = duplicateWeek({
    source,
    targetWeek: "2026-10-26",
    existing: [...source, ...first.created],
  });
  assert.equal(second.created.length, 0);
  assert.equal(second.skipped, 2);
  assert.equal(addDaysToKey("2026-10-19", 7), "2026-10-26");
});

test("equal times are rejected and an earlier end time is an overnight shift", () => {
  const same = validateTimeRange("09:00", "09:00");
  assert.equal(same.endTime, "End time must be different from the start time.");
  const overnight = validateTimeRange("22:00", "06:00");
  assert.equal(overnight.startTime, undefined);
  assert.equal(overnight.endTime, undefined);
  const invalid = validateTimeRange("morning", "17:00");
  assert.equal(invalid.startTime, "Start time must be a time like 09:00.");
});

test("a person cannot be assigned to two overlapping shifts", () => {
  const morning = shift({
    id: "morning",
    date: "2026-10-26",
    startTime: "09:00",
    endTime: "13:00",
    slots: 2,
    assigneeIds: ["sam"],
  });
  const midday = shift({
    id: "midday",
    date: "2026-10-26",
    startTime: "12:00",
    endTime: "16:00",
    slots: 1,
    assigneeIds: [],
  });
  const later = shift({
    id: "later",
    date: "2026-10-27",
    startTime: "12:00",
    endTime: "16:00",
    slots: 1,
    assigneeIds: [],
  });
  assert.equal(
    assignmentBlockReason("sam", midday, [morning, midday, later], []),
    "That person is already on another shift at this time.",
  );
  assert.equal(assignmentBlockReason("jo", midday, [morning, midday, later], []), null);
  assert.equal(assignmentBlockReason("sam", later, [morning, midday, later], []), null);
  const full = shift({
    id: "full",
    date: "2026-10-28",
    slots: 1,
    assigneeIds: ["jo"],
  });
  assert.equal(
    assignmentBlockReason("sam", full, [full], []),
    "This shift already has enough people.",
  );
});
