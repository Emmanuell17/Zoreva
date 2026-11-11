"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useAuth } from "@/components/auth/auth-provider";
import { useCompany } from "@/hooks/use-company";
import { homePathForRole } from "@/lib/firebase/auth";

type LandingAccountProps = {
  placement: "nav" | "hero" | "footer";
};

export function LandingAccount({ placement }: LandingAccountProps) {
  const { user, role, ready } = useAuth();
  const company = useCompany();
  const signedIn = ready && Boolean(user);

  if (!signedIn) {
    if (placement === "nav") return <LoggedOutNav />;
    if (placement === "footer") return <LoggedOutFooter />;
    return (
      <>
        <LoggedOutHero />
        <GoogleNote />
      </>
    );
  }

  const home = homePathForRole(role);
  const isManager = role === "ADMIN";
  const name =
    (isManager ? company?.managerName : null) ||
    user?.displayName ||
    user?.email ||
    (isManager ? "Manager" : "Team member");
  const detail = isManager ? company?.companyName ?? "Manager" : "Team member";
  const destination = isManager ? "Open your shifts" : "Open your schedule";

  if (placement === "nav") {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <p className="hidden max-w-40 text-right sm:block">
          <span className="block truncate text-sm text-foreground">{name}</span>
          <span className="block truncate text-[11px] text-zinc-500">{detail}</span>
        </p>
        <Link
          href={home}
          className="inline-flex min-h-10 items-center rounded-full bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
        >
          {destination}
        </Link>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className={placement === "footer" ? "mt-8 flex flex-col items-center gap-3" : "mt-9 flex flex-col gap-3"}>
      <p className="text-sm text-zinc-300">
        Signed in as <span className="text-foreground">{name}</span>
        {isManager && company?.companyName ? ` · ${company.companyName}` : ""}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={home}
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
        >
          {destination}
        </Link>
        <SignOutButton className="h-11 rounded-full border border-zinc-700 px-6" />
      </div>
    </div>
  );
}

function LoggedOutNav() {
  return (
    <nav className="flex items-center gap-1 sm:gap-3">
      <Link
        href="/join"
        className="inline-flex min-h-10 items-center px-3 text-sm text-zinc-400 transition-colors hover:text-foreground"
      >
        Join a team
      </Link>
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center px-3 text-sm text-zinc-400 transition-colors hover:text-foreground"
      >
        Log in
      </Link>
    </nav>
  );
}

function LoggedOutHero() {
  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link
        href="/register"
        className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
      >
        Get started
      </Link>
      <Link
        href="/join"
        className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium transition-colors hover:bg-zinc-900"
      >
        Join with a code
      </Link>
    </div>
  );
}

function GoogleNote() {
  return (
    <p className="mt-5 text-xs text-zinc-500">
      Sign in with Google. No password to remember.
    </p>
  );
}

function LoggedOutFooter() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link
        href="/register"
        className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
      >
        Get started
      </Link>
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium transition-colors hover:bg-zinc-900"
      >
        Log in
      </Link>
    </div>
  );
}
