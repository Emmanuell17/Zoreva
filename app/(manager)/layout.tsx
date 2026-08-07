import { AppShell } from "@/components/layout/app-shell";
import { managerNav } from "@/lib/navigation";

export default function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell navItems={managerNav} homeHref="/manager" roleLabel="Manager">
      {children}
    </AppShell>
  );
}
