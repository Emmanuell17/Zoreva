import type { AppNotification, Shift, ShiftSwapRequest, User } from "@/types";

export const MOCK_EMPLOYEE_ID = "emp_demo_1";

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

function hoursFromNow(offset: number): string {
  const date = new Date();
  date.setHours(date.getHours() + offset);
  return date.toISOString();
}

export const mockUsers: User[] = [
  {
    id: MOCK_EMPLOYEE_ID,
    name: "Alex Morgan",
    email: "alex.morgan@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-120),
  },
  {
    id: "emp_demo_2",
    name: "Jordan Lee",
    email: "jordan.lee@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-95),
  },
  {
    id: "emp_demo_3",
    name: "Sam Rivera",
    email: "sam.rivera@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-64),
  },
  {
    id: "emp_demo_4",
    name: "Casey Nguyen",
    email: "casey.nguyen@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-40),
  },
  {
    id: "emp_demo_5",
    name: "Riley Brooks",
    email: "riley.brooks@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-18),
  },
  {
    id: "mgr_demo_1",
    name: "Taylor Quinn",
    email: "taylor.quinn@zoreva.app",
    role: "MANAGER",
    createdAt: daysFromToday(-200),
  },
];

export function getMockEmployees(users: User[] = mockUsers): User[] {
  return users
    .filter((user) => user.role === "EMPLOYEE")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const mockEmployeeShifts: Shift[] = [
  {
    id: "shift_1",
    date: daysFromToday(1),
    startTime: "09:00",
    endTime: "17:00",
    employeeId: MOCK_EMPLOYEE_ID,
    status: "PENDING",
    note: null,
    covered: false,
  },
  {
    id: "shift_2",
    date: daysFromToday(2),
    startTime: "12:00",
    endTime: "20:00",
    employeeId: MOCK_EMPLOYEE_ID,
    status: "CONFIRMED",
    note: "Closing coverage",
    covered: false,
  },
  {
    id: "shift_3",
    date: daysFromToday(4),
    startTime: "08:00",
    endTime: "14:00",
    employeeId: MOCK_EMPLOYEE_ID,
    status: "PENDING",
    note: null,
    covered: false,
  },
  {
    id: "shift_4",
    date: daysFromToday(6),
    startTime: "10:00",
    endTime: "18:00",
    employeeId: MOCK_EMPLOYEE_ID,
    status: "CANCELLED",
    note: "Swapped with another team member",
    covered: true,
  },
  {
    id: "shift_5",
    date: daysFromToday(8),
    startTime: "14:00",
    endTime: "22:00",
    employeeId: MOCK_EMPLOYEE_ID,
    status: "CONFIRMED",
    note: null,
    covered: false,
  },
];

export const mockManagerShifts: Shift[] = [
  ...mockEmployeeShifts,
  {
    id: "shift_6",
    date: daysFromToday(1),
    startTime: "14:00",
    endTime: "22:00",
    employeeId: "emp_demo_2",
    status: "CONFIRMED",
    note: null,
    covered: false,
  },
  {
    id: "shift_7",
    date: daysFromToday(3),
    startTime: "09:00",
    endTime: "15:00",
    employeeId: "emp_demo_3",
    status: "PENDING",
    note: "Opening coverage",
    covered: false,
  },
  {
    id: "shift_8",
    date: daysFromToday(3),
    startTime: "16:00",
    endTime: "22:00",
    employeeId: "emp_demo_4",
    status: "CANCELLED",
    note: "Called out sick",
    covered: false,
  },
  {
    id: "shift_9",
    date: daysFromToday(5),
    startTime: "10:00",
    endTime: "18:00",
    employeeId: "emp_demo_5",
    status: "CONFIRMED",
    note: null,
    covered: false,
  },
  {
    id: "shift_10",
    date: daysFromToday(7),
    startTime: "08:00",
    endTime: "16:00",
    employeeId: "emp_demo_2",
    status: "PENDING",
    note: null,
    covered: false,
  },
];

export function getUserName(
  employeeId: string,
  users: User[] = mockUsers,
): string {
  return users.find((user) => user.id === employeeId)?.name ?? "Unknown";
}

export function getUpcomingEmployeeShifts(
  shifts: Shift[] = mockEmployeeShifts,
  limit?: number,
): Shift[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcoming = shifts
    .filter((shift) => new Date(shift.date) >= startOfToday)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.startTime.localeCompare(b.startTime),
    );

  return typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;
}

export function getManagerShifts(shifts: Shift[] = mockManagerShifts): Shift[] {
  return getUpcomingEmployeeShifts(shifts);
}

export function getSwappableShifts(
  currentEmployeeId: string = MOCK_EMPLOYEE_ID,
  shifts: Shift[] = mockManagerShifts,
): Shift[] {
  return getUpcomingEmployeeShifts(shifts).filter(
    (shift) =>
      shift.employeeId !== currentEmployeeId && shift.status !== "CANCELLED",
  );
}

export const mockShiftSwapRequests: ShiftSwapRequest[] = [
  {
    id: "swap_1",
    fromShiftId: "shift_2",
    fromEmployeeId: MOCK_EMPLOYEE_ID,
    toEmployeeId: "emp_demo_2",
    toShiftId: "shift_6",
    message: "Can we trade mid shifts this week?",
    status: "PENDING",
    createdAt: hoursFromNow(-5),
  },
  {
    id: "swap_2",
    fromShiftId: "shift_5",
    fromEmployeeId: MOCK_EMPLOYEE_ID,
    toEmployeeId: "emp_demo_5",
    toShiftId: "shift_9",
    message: null,
    status: "DECLINED",
    createdAt: hoursFromNow(-40),
  },
];

export const mockEmployeeNotifications: AppNotification[] = [
  {
    id: "notif_1",
    title: "New shift assigned",
    body: "You have a pending shift tomorrow from 09:00 to 17:00.",
    href: "/employee/shifts",
    read: false,
    createdAt: hoursFromNow(-2),
    type: "SHIFT_ASSIGNED",
  },
  {
    id: "notif_2",
    title: "Shift confirmed",
    body: "Your mid shift on Tuesday is confirmed.",
    href: "/employee/shifts",
    read: false,
    createdAt: hoursFromNow(-8),
    type: "SHIFT_UPDATED",
  },
  {
    id: "notif_3",
    title: "Availability reminder",
    body: "Submit next week's availability so managers can plan coverage.",
    href: "/employee/availability",
    read: true,
    createdAt: hoursFromNow(-26),
    type: "REMINDER",
  },
  {
    id: "notif_4",
    title: "Coverage update",
    body: "A cancelled shift was marked as covered by your manager.",
    href: "/employee/shifts",
    read: true,
    createdAt: hoursFromNow(-50),
    type: "COVERAGE",
  },
];
