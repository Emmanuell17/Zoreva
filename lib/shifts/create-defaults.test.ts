import assert from "node:assert/strict";
import test from "node:test";
import { defaultSelectedDays, shiftsToCreate } from "@/lib/shifts/create-defaults";

const week = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"];

test("shift creation defaults to a single day", () => {
  assert.deepEqual(defaultSelectedDays(week), ["2026-11-13"]);
  assert.deepEqual(defaultSelectedDays(week, "2026-11-16"), ["2026-11-16"]);
  assert.equal(defaultSelectedDays(week).length, 1);
});

test("the create count is one shift unless several days were chosen", () => {
  assert.equal(shiftsToCreate({ severalDays: false, selectedDayCount: 7, presetCount: 0 }), 1);
  assert.equal(shiftsToCreate({ severalDays: false, selectedDayCount: 1, presetCount: 2 }), 2);
  assert.equal(shiftsToCreate({ severalDays: true, selectedDayCount: 3, presetCount: 2 }), 6);
  assert.equal(shiftsToCreate({ severalDays: true, selectedDayCount: 3, presetCount: 0 }), 0);
});
