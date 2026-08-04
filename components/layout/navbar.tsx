"use client";

import { usePathname } from "next/navigation";
import { getPageTitle, type NavItem } from "@/lib/navigation";

type NavbarProps = {
  navItems: NavItem[];
};

export function Navbar({ navItems }: NavbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname, navItems);

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-zinc-800 bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground uppercase sm:hidden">
          Zoreva
        </span>
        <h1 className="text-sm font-medium tracking-tight text-foreground">
          {title}
        </h1>
      </div>
    </header>
  );
}
