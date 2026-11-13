export type ScheduleSyncPhase = "idle" | "saving" | "saved" | "failed";

export type ScheduleSync = {
  localRevision: number;
  syncedRevision: number;
  phase: ScheduleSyncPhase;
};

export function noteLocalEdit(sync: ScheduleSync): ScheduleSync {
  return {
    localRevision: sync.localRevision + 1,
    syncedRevision: sync.syncedRevision,
    phase: "saving",
  };
}

export function noteRemoteSucceeded(sync: ScheduleSync, revision: number): ScheduleSync {
  if (revision !== sync.localRevision) return sync;
  return {
    localRevision: sync.localRevision,
    syncedRevision: revision,
    phase: "saved",
  };
}

export function noteRemoteFailed(sync: ScheduleSync, revision: number): ScheduleSync {
  if (revision !== sync.localRevision) return sync;
  return {
    localRevision: sync.localRevision,
    syncedRevision: sync.syncedRevision,
    phase: "failed",
  };
}

export function scheduleHasUnsyncedChanges(sync: ScheduleSync): boolean {
  return sync.localRevision !== sync.syncedRevision;
}

type SignedSchedule = {
  shifts: Array<{
    id: string;
    date: string | Date;
    startTime: string;
    endTime: string;
    slots: number;
    status?: string;
    label?: string | null;
    note?: string | null;
    assigneeIds?: string[] | null;
  }>;
  signups: Array<{
    id: string;
    shiftId: string;
    employeeId: string;
    status: string;
  }>;
  hours: Array<{
    id: string;
    shiftId: string;
    employeeId: string;
    startTime: string;
    endTime: string;
  }>;
};

export function scheduleSignature(company: SignedSchedule): string {
  const shifts = company.shifts
    .map((shift) =>
      [
        shift.id,
        String(shift.date),
        shift.startTime,
        shift.endTime,
        shift.slots,
        shift.status ?? "",
        shift.label ?? "",
        shift.note ?? "",
        (shift.assigneeIds ?? []).join(","),
      ].join("|"),
    )
    .sort();
  const signups = company.signups
    .map((signup) => [signup.id, signup.shiftId, signup.employeeId, signup.status].join("|"))
    .sort();
  const hours = company.hours
    .map((entry) => [entry.id, entry.shiftId, entry.employeeId, entry.startTime, entry.endTime].join("|"))
    .sort();
  return `${shifts.join("\n")}\n--\n${signups.join("\n")}\n--\n${hours.join("\n")}`;
}

export function keepLocalSchedule<T extends {
  shifts: unknown[];
  signups: unknown[];
  hours: unknown[];
}>(
  local: T,
  remote: T,
  sync: ScheduleSync,
  expectedSignature: string | null = null,
  remoteSignature: string | null = null,
): T {
  const waitingForOwnWrite =
    expectedSignature !== null && remoteSignature !== null && expectedSignature !== remoteSignature;
  if (!scheduleHasUnsyncedChanges(sync) && !waitingForOwnWrite) return remote;
  return {
    ...remote,
    shifts: local.shifts,
    signups: local.signups,
    hours: local.hours,
  };
}
