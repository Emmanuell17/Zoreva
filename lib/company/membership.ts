import type { Company, User } from "@/types";

/** Setup creates `${companyId}_emp_N` placeholders; real joins use `${companyId}_${uid}`. */
export function isJoinedMember(employee: User, companyId: string): boolean {
  if (employee.role !== "EMPLOYEE") return false;
  if (employee.authUid) return true;
  const prefix = `${companyId}_emp_`;
  return !(employee.id.startsWith(prefix) && /^\d+$/.test(employee.id.slice(prefix.length)));
}

export function attachAuthEmployee(
  company: Company,
  profile: { userId: string; name: string; email: string },
): { company: Company; employee: User } {
  const email = profile.email.trim().toLowerCase();
  const existing =
    company.employees.find((employee) => employee.authUid === profile.userId) ??
    (email
      ? company.employees.find(
          (employee) => employee.email.trim().toLowerCase() === email,
        )
      : undefined);

  if (existing) {
    const employee: User = {
      ...existing,
      name: profile.name.trim() || existing.name,
      email: profile.email.trim() || existing.email,
      role: "EMPLOYEE",
      companyId: company.id,
      authUid: profile.userId,
    };

    return {
      company: {
        ...company,
        employees: company.employees.map((item) =>
          item.id === employee.id ? employee : item,
        ),
      },
      employee,
    };
  }

  const employee: User = {
    id: `${company.id}_${profile.userId}`,
    name: profile.name.trim() || "Employee",
    email: profile.email.trim(),
    role: "EMPLOYEE",
    companyId: company.id,
    authUid: profile.userId,
    createdAt: new Date().toISOString(),
  };

  const employees = [...company.employees, employee];

  return {
    company: {
      ...company,
      employees,
      employeeCount: Math.max(company.employeeCount, employees.length),
    },
    employee,
  };
}
