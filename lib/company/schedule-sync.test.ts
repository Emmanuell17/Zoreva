import assert from "node:assert/strict";
import test from "node:test";
import {
  keepLocalSchedule,
  noteLocalEdit,
  noteRemoteFailed,
  noteRemoteSucceeded,
  scheduleSignature,
  type ScheduleSync,
} from "@/lib/company/schedule-sync";

const clean: ScheduleSync = { localRevision: 0, syncedRevision: 0, phase: "idle" };

test("a failed remote write keeps the local revision dirty and a later success does not erase a newer edit", () => {
  const saving = noteLocalEdit(clean);
  assert.equal(saving.phase, "saving");
  assert.equal(saving.localRevision, 1);

  const failed = noteRemoteFailed(saving, 1);
  assert.equal(failed.phase, "failed");
  assert.notEqual(failed.localRevision, failed.syncedRevision);

  const newer = noteLocalEdit(failed);
  const staleSuccess = noteRemoteSucceeded(newer, 1);
  assert.equal(staleSuccess.phase, "saving");
  assert.equal(staleSuccess.localRevision, 2);
  assert.equal(staleSuccess.syncedRevision, 0);

  const saved = noteRemoteSucceeded(newer, 2);
  assert.equal(saved.phase, "saved");
  assert.equal(saved.syncedRevision, 2);
});

test("a stale remote snapshot does not replace unsynced local shifts", () => {
  const local = {
    shifts: [{ id: "local" }],
    signups: [{ id: "signup-local" }],
    hours: [{ id: "hours-local" }],
  };
  const remote = {
    name: "Remote",
    shifts: [{ id: "stale" }],
    signups: [{ id: "signup-stale" }],
    hours: [{ id: "hours-stale" }],
  };
  const dirty = noteLocalEdit(clean);
  const merged = keepLocalSchedule(local, remote, dirty, null, null);
  assert.equal(merged.name, "Remote");
  assert.equal(merged.shifts[0]?.id, "local");
  assert.equal(merged.signups[0]?.id, "signup-local");
  assert.equal(merged.hours[0]?.id, "hours-local");

  const caughtUp = noteRemoteSucceeded(dirty, dirty.localRevision);
  const echoed = keepLocalSchedule(local, remote, caughtUp, "written", "written");
  assert.equal(echoed.shifts[0]?.id, "stale");
});

test("an older remote snapshot is ignored until it matches the write that just succeeded", () => {
  const local = {
    shifts: [{ id: "new", date: "2026-11-13", startTime: "09:00", endTime: "17:00", slots: 1 }],
    signups: [],
    hours: [],
  };
  const stale = {
    shifts: [{ id: "old", date: "2026-11-12", startTime: "09:00", endTime: "17:00", slots: 1 }],
    signups: [],
    hours: [],
  };
  const saved = noteRemoteSucceeded(noteLocalEdit(clean), 1);
  const kept = keepLocalSchedule(
    local,
    stale,
    saved,
    scheduleSignature(local),
    scheduleSignature(stale),
  );
  assert.equal(kept.shifts[0]?.id, "new");

  const applied = keepLocalSchedule(
    local,
    local,
    saved,
    scheduleSignature(local),
    scheduleSignature(local),
  );
  assert.equal(applied, local);
});
