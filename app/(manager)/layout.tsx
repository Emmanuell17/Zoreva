import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { managerNav } from "@/lib/navigation";

export default function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth allowedRole="MANAGER">
      <AppShell navItems={managerNav} homeHref="/manager" roleLabel="Manager">
        {children}
      </AppShell>
    </RequireAuth>
  );
}
