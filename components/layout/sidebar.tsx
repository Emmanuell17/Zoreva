"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { isNavItemActive, type NavItem } from "@/lib/navigation";

type SidebarProps = {
  navItems: NavItem[];
  homeHref: string;
  roleLabel: string;
};

export function Sidebar({ navItems, homeHref, roleLabel }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, configured, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (!configured) {
      router.push("/login");
      return;
    }

    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-background md:flex lg:w-56">
      <div className="flex h-14 items-center border-b border-border px-4 lg:px-5">
        <Link
          href={homeHref}
          className="font-mono text-sm font-semibold tracking-[0.18em] text-foreground uppercase lg:text-base lg:tracking-[0.2em]"
        >
          Zoreva
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2.5 lg:p-3" aria-label="Main">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href, homeHref);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-medium text-foreground"
                  : "rounded-md px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs font-medium text-zinc-400">{roleLabel}</p>
        {user?.email ? (
          <p className="mt-0.5 truncate text-xs text-zinc-600">{user.email}</p>
        ) : (
          <p className="mt-0.5 text-xs text-zinc-600">Shift coordination</p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={signingOut}
          onClick={handleSignOut}
          className="mt-3 w-full justify-start px-0 text-zinc-500 hover:bg-transparent hover:text-foreground"
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
