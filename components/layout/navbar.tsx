"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { getPageTitle, type NavItem } from "@/lib/navigation";

type NavbarProps = {
  navItems: NavItem[];
  homeHref?: string;
  showNotifications?: boolean;
};

export function Navbar({
  navItems,
  homeHref = "/",
  showNotifications = false,
}: NavbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname, navItems);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={homeHref}
          className="shrink-0 font-mono text-sm font-semibold tracking-[0.18em] text-foreground uppercase md:hidden"
        >
          Zoreva
        </Link>
        <span
          aria-hidden
          className="hidden h-4 w-px shrink-0 bg-border max-md:block"
        />
        <h1 className="truncate text-sm font-medium tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {showNotifications ? <NotificationDropdown /> : null}
    </header>
  );
}
