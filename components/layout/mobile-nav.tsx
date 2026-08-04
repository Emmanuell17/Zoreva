"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/availability", label: "Availability" },
  { href: "/shifts", label: "Shifts" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-3 py-2 md:hidden"
      aria-label="Mobile"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

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
