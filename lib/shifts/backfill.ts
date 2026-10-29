import { civilInterval } from "@/lib/time/interval";
import type { Shift } from "@/types";

export type OpeningRecord = {
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  startMin?: unknown;
  endMin?: unknown;
  endAt?: unknown;
};

export type BoundsPatch = { startMin: number; endMin: number };

/**
 * Adds civil overlap bounds derived from the stored date and wall-clock times.
 * Does not read or write `endAt`, so a device-local finish instant stays as stored.
 * Returns null when the opening already has bounds or the clock cannot be parsed.
 */
export function boundsPatch(opening: OpeningRecord): BoundsPatch | null {
  if (
    typeof opening.startMin === "number" &&
    typeof opening.endMin === "number" &&
    Number.isInteger(opening.startMin) &&
    Number.isInteger(opening.endMin)
  ) {
    return null;
  }
  if (typeof opening.date !== "string" || typeof opening.startTime !== "string" || typeof opening.endTime !== "string") {
    return null;
  }
  const span = civilInterval(opening.date, opening.startTime, opening.endTime);
  if (!span) return null;
  return { startMin: span.start, endMin: span.end };
}

/** Rollback removes only the two bound fields. `endAt` and the wall clock stay. */
export function boundsRollback(opening: OpeningRecord): Array<"startMin" | "endMin"> {
  const fields: Array<"startMin" | "endMin"> = [];
  if ("startMin" in opening) fields.push("startMin");
  if ("endMin" in opening) fields.push("endMin");
  return fields;
}

export type LedgerBooking = {
  employeeId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  startMin: number;
  endMin: number;
};

/**
 * Turns saved assignee ids into claim bookings.
 * This is the ledger a later trusted write must store. It does not contact Firestore.
 */
export function ledgerFromAssignees(
  shifts: Array<Pick<Shift, "id" | "date" | "startTime" | "endTime" | "assigneeIds">>,
): LedgerBooking[] {
  const bookings: LedgerBooking[] = [];
  for (const shift of shifts) {
    const date = typeof shift.date === "string" ? shift.date : "";
    const span = civilInterval(date, shift.startTime, shift.endTime);
    if (!span) continue;
    for (const employeeId of shift.assigneeIds ?? []) {
      if (!employeeId || bookings.some((item) => item.employeeId === employeeId && item.shiftId === shift.id)) {
        continue;
      }
      bookings.push({
        employeeId,
        shiftId: shift.id,
        date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        startMin: span.start,
        endMin: span.end,
      });
    }
  }
  return bookings;
}
