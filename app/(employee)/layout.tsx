import { AppShell } from "@/components/layout/app-shell";
import { employeeNav } from "@/lib/navigation";

export default function EmployeeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      navItems={employeeNav}
      homeHref="/employee"
      roleLabel="Employee"
      showNotifications
    >
      {children}
    </AppShell>
  );
}
