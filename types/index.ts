export type Role = "EMPLOYEE" | "ADMIN";

export type SignupStatus = "SELECTED" | "CONFIRMED";

export type HoursStatus = "SUBMITTED" | "APPROVED" | "CHECK_PAPER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId?: string | null;
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
  companyName: string;
  managerName: string;
  email: string;
  employeeCount: number;
  shiftTemplates: ShiftTemplate[];
  employees: User[];
  shifts: Shift[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
  setupCompletedAt: string;
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
  reviewedAt?: string | Date | null;
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
