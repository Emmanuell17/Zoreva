import { civilDayNumber, normalizeClock } from "@/lib/time/interval";
import type { AvailabilityWindow, TimeOffRequest, TimeOffStatus } from "@/types";

export type StaffingState = {
  availability: AvailabilityWindow[];
  timeOff: TimeOffRequest[];
};

type Failure = { ok: false; reason: string };

export function prepareAvailabilityWindow(input: {
  id: string;
  employeeId: string;
  kind: "recurring" | "date";
  weekday: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  available: boolean;
  note?: string;
  updatedAt: string;
}): { ok: true; window: AvailabilityWindow } | Failure {
  const startTime = normalizeClock(input.startTime);
  const endTime = normalizeClock(input.endTime);
  if (!startTime || !endTime) return { ok: false, reason: "Enter a start and end time like 09:00." };
  if (startTime === endTime) {
    return { ok: false, reason: "End time must be different from the start time." };
  }
  if (input.kind === "recurring" && (input.weekday === null || input.weekday < 0 || input.weekday > 6)) {
    return { ok: false, reason: "Choose the day of the week." };
  }
  if (input.kind === "date" && !civilDayNumber(input.date ?? "")) {
    return { ok: false, reason: "Choose a date." };
  }
  return {
    ok: true,
    window: {
      id: input.id,
      employeeId: input.employeeId,
      kind: input.kind,
      weekday: input.kind === "recurring" ? input.weekday : null,
      date: input.kind === "date" ? input.date : null,
      startTime,
      endTime,
      available: input.available,
      note: input.note?.trim() || null,
      updatedAt: input.updatedAt,
    },
  };
}

export function prepareTimeOffRequest(input: {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
}): { ok: true; request: TimeOffRequest } | Failure {
  if (!civilDayNumber(input.startDate) || !civilDayNumber(input.endDate)) {
    return { ok: false, reason: "Choose the dates you need off." };
  }
  if (input.endDate < input.startDate) {
    return { ok: false, reason: "The end date must be on or after the start date." };
  }
  const partial = Boolean(input.startTime || input.endTime);
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (partial) {
    if (input.startDate !== input.endDate) {
      return { ok: false, reason: "Times are only for a single day. Clear them for more than one day." };
    }
    startTime = normalizeClock(input.startTime ?? "");
    endTime = normalizeClock(input.endTime ?? "");
    if (!startTime || !endTime) {
      return { ok: false, reason: "Enter both a start and end time, or leave both empty." };
    }
    if (startTime === endTime) {
      return { ok: false, reason: "End time must be different from the start time." };
    }
  }
  return {
    ok: true,
    request: {
      id: input.id,
      employeeId: input.employeeId,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime,
      endTime,
      reason: input.reason?.trim() || null,
      status: "pending",
      reviewNote: null,
      createdAt: input.createdAt,
      reviewedAt: null,
    },
  };
}

export function withAvailability(state: StaffingState, window: AvailabilityWindow): StaffingState {
  return { ...state, availability: [...state.availability, window] };
}

export function withoutAvailability(state: StaffingState, id: string, employeeId: string): StaffingState | Failure {
  const existing = state.availability.find((window) => window.id === id);
  if (!existing || existing.employeeId !== employeeId) {
    return { ok: false, reason: "That availability is no longer on your list." };
  }
  return { ...state, availability: state.availability.filter((window) => window.id !== id) };
}

export function withTimeOff(state: StaffingState, request: TimeOffRequest): StaffingState {
  return { ...state, timeOff: [...state.timeOff, request] };
}

export function withoutPendingTimeOff(
  state: StaffingState,
  id: string,
  employeeId: string,
): StaffingState | Failure {
  const existing = state.timeOff.find((request) => request.id === id);
  if (!existing || existing.employeeId !== employeeId) {
    return { ok: false, reason: "That request is no longer on your list." };
  }
  if (existing.status !== "pending") {
    return { ok: false, reason: "Only a request that is still waiting can be cancelled." };
  }
  return { ...state, timeOff: state.timeOff.filter((request) => request.id !== id) };
}

export function reviewTimeOffRequest(
  state: StaffingState,
  id: string,
  status: Extract<TimeOffStatus, "approved" | "rejected">,
  reviewedAt: string,
): { ok: true; state: StaffingState; request: TimeOffRequest } | (Failure & { state: StaffingState }) {
  const existing = state.timeOff.find((request) => request.id === id);
  if (!existing) {
    return { ok: false, reason: "That request is no longer in the list.", state };
  }
  if (existing.status !== "pending") {
    return { ok: false, reason: "That request has already been decided.", state };
  }
  const request: TimeOffRequest = { ...existing, status, reviewedAt };
  return {
    ok: true,
    request,
    state: {
      ...state,
      timeOff: state.timeOff.map((item) => (item.id === id ? request : item)),
    },
  };
}
