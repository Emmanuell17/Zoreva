import { calendarDayKey, shiftDateTime, timesOverlap } from "@/lib/shift-utils";

/**
 * Saved booking model:
 * openings/{shiftId} stores slots, taken, and the shift's date and times.
 * signups/{employeeId~shiftId} is that employee's assignment.
 * The signup id is derived from the employee and shift, so a retry finds the
 * same assignment instead of creating another one.
 * taken changes only together with that signup being created or deleted.
 * An overlap is another signup for the same employee whose opening covers
 * the same day and crosses these times.
 */

export const MAX_TRACKED_SHIFTS = 40;
export const MAX_CLAIMED_SHIFTS = 12;

export type OpeningState = {
  shiftId: string;
  slots: number;
  taken: number;
  date: string;
  startTime: string;
  endTime: string;
  endAt: number;
};

export type HeldShift = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type BookedSignup = {
  id: string;
  shiftId: string;
  employeeId: string;
  status: "SELECTED" | "CONFIRMED";
  selectedAt: string;
  confirmedAt: string | null;
};

export type ShiftWriteResult =
  | {
      ok: true;
      alreadyBooked?: boolean;
      alreadyCancelled?: boolean;
      signup: BookedSignup | null;
    }
  | { ok: false; reason: string };

type BookingFailure = {
  ok: false;
  code: "missing" | "past" | "full" | "overlap" | "wrong-company" | "invalid";
  reason: string;
};

export function signupDocumentId(employeeId: string, shiftId: string): string | null {
  if (!employeeId || !shiftId) return null;
  if (employeeId.includes("~") || shiftId.includes("~")) return null;
  if (employeeId.length > 200 || shiftId.length >= 120) return null;
  const id = `${employeeId}~${shiftId}`;
  return id.length < 400 ? id : null;
}

export function openingFromShift(
  shift: {
    id: string;
    date: string | Date;
    startTime: string;
    endTime: string;
    slots: number;
  },
  taken: number,
): OpeningState {
  const counted = Math.max(0, Math.trunc(taken) || 0);
  const requested = Math.max(1, Math.trunc(shift.slots) || 1);
  return {
    shiftId: shift.id,
    slots: Math.max(requested, counted),
    taken: counted,
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    endAt: shiftDateTime(shift, "end").getTime(),
  };
}

export function readOpening(
  shiftId: string,
  data: Record<string, unknown> | null,
): OpeningState | null {
  if (!data) return null;
  const slots = data.slots;
  const taken = data.taken;
  const endAt = data.endAt;
  const date = data.date;
  const startTime = data.startTime;
  const endTime = data.endTime;
  if (
    typeof slots !== "number" ||
    typeof taken !== "number" ||
    typeof endAt !== "number" ||
    !Number.isInteger(slots) ||
    !Number.isInteger(taken) ||
    !Number.isInteger(endAt) ||
    typeof date !== "string" ||
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  ) {
    return null;
  }
  return { shiftId, slots, taken, date, startTime, endTime, endAt };
}

export function openingWrite(
  opening: OpeningState,
  heldSignupId = "",
): Record<string, string | number> {
  return {
    slots: opening.slots,
    taken: opening.taken,
    date: opening.date,
    startTime: opening.startTime,
    endTime: opening.endTime,
    endAt: opening.endAt,
    heldSignupId,
  };
}

function sameMember(input: {
  companyId: string;
  memberCompanyId: string;
  employeeId: string;
  memberEmployeeId: string;
}): boolean {
  return (
    input.companyId.length > 0 &&
    input.companyId === input.memberCompanyId &&
    input.employeeId.length > 0 &&
    input.employeeId === input.memberEmployeeId
  );
}

export function decideBooking(input: {
  companyId: string;
  memberCompanyId: string;
  employeeId: string;
  memberEmployeeId: string;
  shiftId: string;
  now: number;
  opening: OpeningState | null;
  signupExists: boolean;
  held: HeldShift[];
}):
  | {
      ok: true;
      alreadyBooked: boolean;
      taken: number;
      signupId: string;
      selectedAt: string;
    }
  | BookingFailure {
  if (!sameMember(input)) {
    return {
      ok: false,
      code: "wrong-company",
      reason: "You can only book shifts for your own company.",
    };
  }
  const signupId = signupDocumentId(input.employeeId, input.shiftId);
  if (!signupId) {
    return { ok: false, code: "invalid", reason: "That shift is no longer available." };
  }
  if (input.signupExists) {
    return {
      ok: true,
      alreadyBooked: true,
      taken: input.opening?.taken ?? 0,
      signupId,
      selectedAt: "",
    };
  }
  if (!input.opening || input.opening.shiftId !== input.shiftId) {
    return {
      ok: false,
      code: "missing",
      reason: "That shift is not open for booking yet.",
    };
  }
  if (input.opening.endAt <= input.now) {
    return { ok: false, code: "past", reason: "This shift has already finished." };
  }
  if (input.opening.taken >= input.opening.slots) {
    return { ok: false, code: "full", reason: "This shift is full." };
  }
  if (input.held.length >= MAX_CLAIMED_SHIFTS) {
    return {
      ok: false,
      code: "invalid",
      reason: "You have too many saved shifts to book another right now.",
    };
  }
  const overlaps = input.held.some(
    (other) =>
      other.shiftId !== input.shiftId &&
      other.date === input.opening?.date &&
      timesOverlap(
        input.opening.startTime,
        input.opening.endTime,
        other.startTime,
        other.endTime,
      ),
  );
  if (overlaps) {
    return {
      ok: false,
      code: "overlap",
      reason: "This overlaps another shift you already chose.",
    };
  }
  return {
    ok: true,
    alreadyBooked: false,
    taken: input.opening.taken + 1,
    signupId,
    selectedAt: new Date(input.now).toISOString(),
  };
}

export function decideCancellation(input: {
  companyId: string;
  memberCompanyId: string;
  employeeId: string;
  memberEmployeeId: string;
  shiftId: string;
  now: number;
  opening: OpeningState | null;
  signupExists: boolean;
}):
  | { ok: true; alreadyCancelled: boolean; taken: number }
  | BookingFailure {
  if (!sameMember(input)) {
    return {
      ok: false,
      code: "wrong-company",
      reason: "You can only change shifts for your own company.",
    };
  }
  if (!input.signupExists) {
    return { ok: true, alreadyCancelled: true, taken: input.opening?.taken ?? 0 };
  }
  if (!input.opening || input.opening.shiftId !== input.shiftId) {
    return {
      ok: false,
      code: "missing",
      reason: "Could not update that shift. Try again.",
    };
  }
  if (input.opening.endAt <= input.now) {
    return { ok: false, code: "past", reason: "This shift has already finished." };
  }
  if (input.opening.taken <= 0) {
    return {
      ok: false,
      code: "invalid",
      reason: "Could not update that shift. Try again.",
    };
  }
  return { ok: true, alreadyCancelled: false, taken: input.opening.taken - 1 };
}

export function decideConfirmation(input: {
  companyId: string;
  memberCompanyId: string;
  employeeId: string;
  memberEmployeeId: string;
  now: number;
  opening: OpeningState | null;
  signup: BookedSignup | null;
}): { ok: true; alreadyConfirmed: boolean } | BookingFailure {
  if (!sameMember(input)) {
    return {
      ok: false,
      code: "wrong-company",
      reason: "You can only change shifts for your own company.",
    };
  }
  if (!input.signup) {
    return { ok: false, code: "missing", reason: "You are not on this shift." };
  }
  if (input.signup.status === "CONFIRMED") {
    return { ok: true, alreadyConfirmed: true };
  }
  if (!input.opening || input.opening.endAt <= input.now) {
    return { ok: false, code: "past", reason: "This shift has already finished." };
  }
  return { ok: true, alreadyConfirmed: false };
}
