import { usersSeed } from "@/lib/mocks/users";
import type { User } from "@/types";

export { CURRENT_EMPLOYEE_ID } from "@/lib/mocks/users";

export function getUsers(): User[] {
  return usersSeed.map((user) => ({ ...user }));
}

export function getEmployees(): User[] {
  return getUsers()
    .filter((user) => user.role === "EMPLOYEE")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getEmployeeName(employeeId: string): string {
  return (
    usersSeed.find((user) => user.id === employeeId)?.name ?? "Unknown"
  );
}
