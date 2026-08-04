"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, type NavItem } from "@/lib/navigation";

type MobileNavProps = {
  navItems: NavItem[];
  homeHref: string;
};

export function MobileNav({ navItems, homeHref }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-3 py-2 md:hidden"
      aria-label="Mobile"
    >
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href, homeHref);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-foreground"
                : "shrink-0 rounded-md px-3 py-1.5 text-xs text-zinc-400"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
