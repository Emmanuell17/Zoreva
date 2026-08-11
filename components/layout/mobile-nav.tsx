"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  navItems: NavItem[];
  homeHref: string;
};

export function MobileNav({ navItems, homeHref }: MobileNavProps) {
  const pathname = usePathname();
  const equalTabs = navItems.length <= 5;

  return (
    <nav
      className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm md:hidden"
      aria-label="Mobile"
    >
      <div
        className={cn(
          "flex gap-1 px-2 py-2",
          equalTabs
            ? "justify-between"
            : "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href, homeHref);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                equalTabs ? "flex-1" : "shrink-0",
                isActive
                  ? "bg-zinc-900 text-foreground"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
