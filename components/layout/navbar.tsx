"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/availability": "Availability",
  "/shifts": "Shifts",
};

export function Navbar() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Zoreva";

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
