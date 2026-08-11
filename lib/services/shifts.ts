import { teamShiftsSeed } from "@/lib/mocks/shifts";
import { CURRENT_EMPLOYEE_ID } from "@/lib/mocks/users";
import type { Shift } from "@/types";

let teamShifts: Shift[] = teamShiftsSeed.map((shift) => ({ ...shift }));
let managerShiftsSnapshot = sortUpcoming(teamShifts);
const employeeShiftsSnapshots = new Map<string, Shift[]>();

const listeners = new Set<() => void>();

function notify() {
  managerShiftsSnapshot = sortUpcoming(teamShifts);
  employeeShiftsSnapshots.clear();
  listeners.forEach((listener) => listener());
}

function sortUpcoming(shifts: Shift[]): Shift[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return shifts
    .filter((shift) => new Date(shift.date) >= startOfToday)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.startTime.localeCompare(b.startTime),
    );
}

function getCachedEmployeeShifts(
  employeeId: string,
  limit?: number,
): Shift[] {
  const key = `${employeeId}:${limit ?? "all"}`;
  const cached = employeeShiftsSnapshots.get(key);
  if (cached) return cached;

  const shifts = sortUpcoming(
    teamShifts.filter((shift) => shift.employeeId === employeeId),
  );
  const next = typeof limit === "number" ? shifts.slice(0, limit) : shifts;
  employeeShiftsSnapshots.set(key, next);
  return next;
}

export function getEmployeeShifts(
  employeeId: string = CURRENT_EMPLOYEE_ID,
  limit?: number,
): Shift[] {
  return getCachedEmployeeShifts(employeeId, limit);
}

export function getManagerShifts(): Shift[] {
  return managerShiftsSnapshot;
}

export function getSwappableShifts(
  currentEmployeeId: string = CURRENT_EMPLOYEE_ID,
): Shift[] {
  return getManagerShifts().filter(
    (shift) =>
      shift.employeeId !== currentEmployeeId && shift.status !== "CANCELLED",
  );
}

export function getShiftById(shiftId: string): Shift | undefined {
  return teamShifts.find((shift) => shift.id === shiftId);
}

export function createShift(input: {
  employeeId: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  note?: string | null;
}): Shift {
  const shift: Shift = {
    id: `shift_${Date.now()}`,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    employeeId: input.employeeId,
    status: "PENDING",
    note: input.note ?? null,
    covered: false,
    createdAt: new Date().toISOString(),
  };

  teamShifts = [...teamShifts, shift];
  notify();
  return shift;
}

export function updateShiftStatus(
  shiftId: string,
  status: Shift["status"],
  note?: string | null,
): Shift | undefined {
  let updated: Shift | undefined;

  teamShifts = teamShifts.map((shift) => {
    if (shift.id !== shiftId) return shift;
    updated = {
      ...shift,
      status,
      note: note === undefined ? shift.note : note,
    };
    return updated;
  });

  if (updated) notify();
  return updated;
}

export function subscribeShifts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
