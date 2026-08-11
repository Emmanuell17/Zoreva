import { MobileNav } from "@/components/layout/mobile-nav";
import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { Sidebar } from "@/components/layout/sidebar";
import type { NavItem } from "@/lib/navigation";

type AppShellProps = {
  children: React.ReactNode;
  navItems: NavItem[];
  homeHref: string;
  roleLabel: string;
  showNotifications?: boolean;
};

export function AppShell({
  children,
  navItems,
  homeHref,
  roleLabel,
  showNotifications = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 pb-[env(safe-area-inset-bottom)]">
      <Sidebar navItems={navItems} homeHref={homeHref} roleLabel={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          navItems={navItems}
          homeHref={homeHref}
          showNotifications={showNotifications}
        />
        <MobileNav navItems={navItems} homeHref={homeHref} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
