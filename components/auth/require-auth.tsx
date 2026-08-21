"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { homePathForRole } from "@/lib/firebase/auth";
import type { Role } from "@/types";

type RequireAuthProps = {
  children: React.ReactNode;
  allowedRole?: Role;
};

export function RequireAuth({ children, allowedRole }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, configured } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!configured) {
      // Allow browsing the UI without Firebase during local setup.
      return;
    }

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRole) {
      const effectiveRole = role ?? "EMPLOYEE";
      if (effectiveRole !== allowedRole) {
        router.replace(homePathForRole(effectiveRole));
      }
    }
  }, [allowedRole, configured, loading, pathname, role, router, user]);

  if (!configured) {
    return <>{children}</>;
  }

  const effectiveRole = role ?? "EMPLOYEE";
  const roleMismatch = Boolean(allowedRole && effectiveRole !== allowedRole);

  if (loading || !user || roleMismatch) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <LoadingState label="Checking session…" />
      </div>
    );
  }

  return <>{children}</>;
}
