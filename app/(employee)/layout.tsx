import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { employeeNav } from "@/lib/navigation";

export default function EmployeeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth allowedRole="EMPLOYEE">
      <AppShell
        navItems={employeeNav}
        homeHref="/employee"
        roleLabel="Employee"
        showNotifications
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
