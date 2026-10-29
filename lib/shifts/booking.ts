import { calendarDayKey } from "@/lib/shift-utils";
import { civilInterval, shiftsOverlap } from "@/lib/time/interval";
import { DEFAULT_BUSINESS_TIMEZONE, shiftEndUtc } from "@/lib/time/zoned";

/**
 * Saved booking model:
 * openings/{shiftId} stores slots, taken, and the shift's date and times.
 * signups/{employeeId~shiftId} is that employee's assignment.
 * The signup id is derived from the employee and shift, so a retry finds the
 * same assignment instead of creating another one.
 * taken changes only together with that signup being created or deleted.
 * An overlap is another signup whose wall-clock interval crosses this one,
 * including a shift that starts the day before and ends after midnight.
 * Rules compare the stored startMin/endMin on the claim. Older claims
 * without those numbers still use a same-day clock comparison.
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
  startMin?: number;
  endMin?: number;
  timeZone?: string;
};

export type HeldShift = {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  startMin?: number;
  endMin?: number;
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
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): OpeningState {
  const counted = Math.max(0, Math.trunc(taken) || 0);
  const requested = Math.max(1, Math.trunc(shift.slots) || 1);
  const date = calendarDayKey(shift.date);
  const span = civilInterval(date, shift.startTime, shift.endTime);
  const zone = timeZone || DEFAULT_BUSINESS_TIMEZONE;
  const endAt = shiftEndUtc(date, shift.startTime, shift.endTime, zone) ?? 0;
  return {
    shiftId: shift.id,
    slots: Math.max(requested, counted),
    taken: counted,
    date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    endAt,
    timeZone: zone,
    ...(span ? { startMin: span.start, endMin: span.end } : {}),
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
  const startMin = data.startMin;
  const endMin = data.endMin;
  const timeZone = data.timeZone;
  const bounds =
    typeof startMin === "number" &&
    typeof endMin === "number" &&
    Number.isInteger(startMin) &&
    Number.isInteger(endMin) &&
    endMin > startMin
      ? { startMin, endMin }
      : {};
  return {
    shiftId,
    slots,
    taken,
    date,
    startTime,
    endTime,
    endAt,
    ...bounds,
    ...(typeof timeZone === "string" && timeZone ? { timeZone } : {}),
  };
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
    ...(opening.startMin !== undefined && opening.endMin !== undefined
      ? { startMin: opening.startMin, endMin: opening.endMin }
      : {}),
    ...(opening.timeZone ? { timeZone: opening.timeZone } : {}),
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
  const overlaps = input.held.some((other) => {
    if (other.shiftId === input.shiftId || !input.opening) return false;
    return shiftsOverlap(
      {
        date: input.opening.date,
        startTime: input.opening.startTime,
        endTime: input.opening.endTime,
      },
      other,
    );
  });
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

export function decideAssignment(input: {
  companyId: string;
  memberCompanyId: string;
  employeeId: string;
  now: number;
  opening: OpeningState | null;
  held: HeldShift[];
  alreadyAssigned: boolean;
}): { ok: true; alreadyAssigned: boolean; booking: HeldShift | null } | BookingFailure {
  if (!input.companyId || input.companyId !== input.memberCompanyId) {
    return {
      ok: false,
      code: "wrong-company",
      reason: "You can only change shifts for your own company.",
    };
  }
  if (!input.employeeId) {
    return { ok: false, code: "invalid", reason: "Choose a person from your team." };
  }
  if (input.alreadyAssigned) return { ok: true, alreadyAssigned: true, booking: null };
  if (!input.opening) {
    return { ok: false, code: "missing", reason: "Publish this shift before assigning someone." };
  }
  if (input.opening.endAt <= input.now) {
    return { ok: false, code: "past", reason: "This shift has already finished." };
  }
  if (input.held.length >= MAX_CLAIMED_SHIFTS) {
    return {
      ok: false,
      code: "invalid",
      reason: "That person has too many saved shifts to assign another right now.",
    };
  }
  const overlaps = input.held.some((other) => {
    if (!input.opening || other.shiftId === input.opening.shiftId) return false;
    return shiftsOverlap(input.opening, other);
  });
  if (overlaps) {
    return {
      ok: false,
      code: "overlap",
      reason: "That person is already on another shift at this time.",
    };
  }
  if (input.opening.startMin === undefined || input.opening.endMin === undefined) {
    return {
      ok: false,
      code: "invalid",
      reason: "This shift is missing its time bounds. Save the rota and try again.",
    };
  }
  return {
    ok: true,
    alreadyAssigned: false,
    booking: {
      shiftId: input.opening.shiftId,
      date: input.opening.date,
      startTime: input.opening.startTime,
      endTime: input.opening.endTime,
      startMin: input.opening.startMin,
      endMin: input.opening.endMin,
    },
  };
}
