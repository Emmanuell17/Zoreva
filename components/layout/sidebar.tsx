"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/availability", label: "Availability" },
  { href: "/shifts", label: "Shifts" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-background md:flex">
      <div className="flex h-14 items-center border-b border-zinc-800 px-5">
        <Link
          href="/"
          className="font-mono text-base font-semibold tracking-[0.2em] text-foreground uppercase"
        >
          Zoreva
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
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
                  ? "rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-foreground"
                  : "rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <p className="text-xs text-zinc-600">Shift coordination</p>
      </div>
    </aside>
  );
}
