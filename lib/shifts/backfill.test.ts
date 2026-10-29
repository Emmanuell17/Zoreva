import assert from "node:assert/strict";
import test from "node:test";
import { boundsPatch, boundsRollback, ledgerFromAssignees } from "@/lib/shifts/backfill";
import { civilInterval } from "@/lib/time/interval";

test("bounds are filled from the wall clock and endAt is left untouched", () => {
  const endAt = Date.parse("2026-10-27T05:00:00.000Z");
  const opening = {
    date: "2026-10-26",
    startTime: "22:00",
    endTime: "06:00",
    endAt,
  };
  const patch = boundsPatch(opening);
  const span = civilInterval("2026-10-26", "22:00", "06:00");
  assert.deepEqual(patch, span ? { startMin: span.start, endMin: span.end } : null);
  assert.equal(opening.endAt, endAt);
  assert.equal(boundsPatch({ ...opening, ...patch }), null);
});

test("rollback removes only the bound fields", () => {
  assert.deepEqual(
    boundsRollback({ date: "2026-10-26", startTime: "09:00", endTime: "17:00", endAt: 10, startMin: 1, endMin: 2 }),
    ["startMin", "endMin"],
  );
  assert.deepEqual(boundsRollback({ endAt: 10 }), []);
});

test("existing assignees become claim bookings without changing the shift clock", () => {
  const bookings = ledgerFromAssignees([
    {
      id: "night",
      date: "2026-10-26",
      startTime: "22:00",
      endTime: "06:00",
      assigneeIds: ["sam", "sam"],
    },
    {
      id: "later",
      date: "2026-10-27",
      startTime: "06:00",
      endTime: "10:00",
      assigneeIds: ["sam"],
    },
  ]);
  assert.equal(bookings.length, 2);
  assert.equal(bookings[0]?.employeeId, "sam");
  assert.equal(bookings[0]?.shiftId, "night");
  assert.ok((bookings[0]?.endMin ?? 0) > (bookings[0]?.startMin ?? 0));
  assert.equal(bookings[1]?.shiftId, "later");
  assert.equal(bookings[0]?.endMin, bookings[1]?.startMin);
});
