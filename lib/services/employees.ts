import {
  getActiveEmployees,
  getCurrentEmployeeId,
} from "@/lib/company/store";
import { CURRENT_EMPLOYEE_ID } from "@/lib/mocks/users";
import type { User } from "@/types";

export { CURRENT_EMPLOYEE_ID, getCurrentEmployeeId };

export function getUsers(): User[] {
  return getActiveEmployees();
}

export function getEmployees(): User[] {
  return getUsers()
    .filter((user) => user.role === "EMPLOYEE")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getEmployeeName(employeeId: string): string {
  return getUsers().find((user) => user.id === employeeId)?.name ?? "Unknown";
}
