export type Role = "EMPLOYEE" | "MANAGER";

export type ShiftStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
};

export type Shift = {
  id: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  employeeId: string;
  status: ShiftStatus;
  note?: string | null;
  covered: boolean;
  createdAt?: string | Date;
};

export type Availability = {
  id: string;
  employeeId: string;
  date: string | Date;
  available: boolean;
  note?: string | null;
  createdAt?: string | Date;
};

export type NotificationType =
  | "SHIFT_ASSIGNED"
  | "SHIFT_UPDATED"
  | "REMINDER"
  | "COVERAGE";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string | Date;
  type: NotificationType;
};

export type SwapRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";

export type ShiftSwapRequest = {
  id: string;
  fromShiftId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  toShiftId?: string | null;
  message?: string | null;
  status: SwapRequestStatus;
  createdAt: string | Date;
};