import { getActiveEmployees } from "@/lib/company/store";

export function getEmployeeName(employeeId: string): string {
  return getActiveEmployees().find((user) => user.id === employeeId)?.name ?? "Unknown";
}
