import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth allowedRole="ADMIN">
      <AppShell navItems={adminNav} homeHref="/admin" roleLabel="Manager">
        {children}
      </AppShell>
    </RequireAuth>
  );
}
