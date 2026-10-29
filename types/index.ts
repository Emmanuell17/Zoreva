import type { AvailabilityRules } from "@/lib/availability/rules";

export type Role = "EMPLOYEE" | "ADMIN";

export type SignupStatus = "SELECTED" | "CONFIRMED";

export type HoursStatus = "SUBMITTED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId?: string | null;
  authUid?: string | null;
  createdAt: string | Date;
};

export type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slots: number;
  positions: string[];
};

export type Company = {
  id: string;
  ownerId: string;
  joinCode: string;
  joinCodeExpiresAt?: string;
  companyName: string;
  managerName: string;
  email: string;
  employeeCount: number;
  shiftTemplates: ShiftTemplate[];
  employees: User[];
  shifts: Shift[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
  availability?: AvailabilityWindow[];
  timeOff?: TimeOffRequest[];
  availabilityRules?: Partial<AvailabilityRules>;
  setupCompletedAt: string;
  /** IANA zone used to turn a wall-clock end into `endAt`. Missing means UTC. */
  timezone?: string;
};

export type CompanyMembership = {
  userId: string;
  companyId: string;
  employeeId: string;
  role: Role;
};

export type CompanySetupInput = {
  companyName: string;
  managerName: string;
  email: string;
  employeeCount: number;
  shiftTemplates: Array<Omit<ShiftTemplate, "id">>;
};

export type Shift = {
  id: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  label?: string | null;
  slots: number;
  note?: string | null;
  positions?: string[] | null;
  assigneeIds?: string[] | null;
  status?: "draft" | "published";
  companyId?: string | null;
  createdAt?: string | Date;
};

export type ShiftSignup = {
  id: string;
  shiftId: string;
  employeeId: string;
  status: SignupStatus;
  selectedAt: string | Date;
  confirmedAt?: string | Date | null;
};

export type HoursEntry = {
  id: string;
  shiftId: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  note?: string | null;
  status: HoursStatus;
  submittedAt: string | Date;
};

export type AvailabilityWindow = {
  id: string;
  employeeId: string;
  kind: "recurring" | "date";
  weekday: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  available: boolean;
  note?: string | null;
  updatedAt: string;
};

export type TimeOffStatus = "pending" | "approved" | "rejected";

export type TimeOffRequest = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason?: string | null;
  status: TimeOffStatus;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export type ReminderKind = "CONFIRM" | "HOURS" | "SHIFT";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string | Date;
  type: ReminderKind;
};
