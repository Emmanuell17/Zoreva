import assert from "node:assert/strict";
import test from "node:test";
import { shiftEndUtc, zonedWallTimeToUtc } from "@/lib/time/zoned";

test("wall-clock instants use the named timezone, including overnight and daylight saving", () => {
  assert.equal(zonedWallTimeToUtc("2026-10-26", "12:00", "UTC"), Date.UTC(2026, 9, 26, 12, 0));
  assert.equal(
    zonedWallTimeToUtc("2026-10-26", "12:00", "Europe/Paris"),
    Date.UTC(2026, 9, 26, 11, 0),
  );
  assert.equal(
    zonedWallTimeToUtc("2026-07-01", "12:00", "Europe/Paris"),
    Date.UTC(2026, 6, 1, 10, 0),
  );
  assert.equal(
    shiftEndUtc("2026-10-26", "22:00", "06:00", "Europe/Paris"),
    Date.UTC(2026, 9, 27, 5, 0),
  );
  assert.equal(
    zonedWallTimeToUtc("2026-03-08", "02:30", "America/New_York"),
    Date.UTC(2026, 2, 8, 7, 30),
  );
  assert.equal(
    zonedWallTimeToUtc("2026-11-01", "01:30", "America/New_York"),
    Date.UTC(2026, 10, 1, 5, 30),
  );
});
