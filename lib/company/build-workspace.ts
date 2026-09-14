import type { Company, CompanySetupInput, User } from "@/types";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return slug || "company";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildCompanyWorkspace(
  ownerId: string,
  input: CompanySetupInput,
): Company {
  const now = new Date().toISOString();
  const id = `co_${Date.now()}`;
  const slug = slugify(input.companyName);

  const shiftTemplates = input.shiftTemplates.map((template, index) => ({
    id: `${id}_tpl_${index + 1}`,
    name: template.name.trim(),
    startTime: template.startTime,
    endTime: template.endTime,
    slots: template.slots,
    positions: template.positions.map((position) => position.trim()).filter(Boolean),
  }));

  const employees: User[] = Array.from({ length: input.employeeCount }, (_, index) => ({
    id: `${id}_emp_${index + 1}`,
    name: `Employee ${index + 1}`,
    email: `employee${index + 1}@${slug}.team`,
    role: "EMPLOYEE",
    companyId: id,
    createdAt: now,
  }));

  return clone({
    id,
    ownerId,
    companyName: input.companyName.trim(),
    managerName: input.managerName.trim(),
    email: input.email.trim(),
    employeeCount: input.employeeCount,
    shiftTemplates,
    employees,
    shifts: [],
    signups: [],
    hours: [],
    setupCompletedAt: now,
  });
}
