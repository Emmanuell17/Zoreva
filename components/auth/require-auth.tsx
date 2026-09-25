"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { ownerIdFromAuth, resolveAppPath } from "@/lib/company";
import { homePathForRole } from "@/lib/firebase/auth";
import type { Role } from "@/types";

type RequireAuthProps = {
  children: React.ReactNode;
  allowedRole?: Role;
};

export function RequireAuth({ children, allowedRole }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, configured, ready } = useAuth();

  const effectiveRole = role ?? allowedRole ?? "EMPLOYEE";
  const ownerId = ownerIdFromAuth({ uid: user?.uid, configured });
  const destination = resolveAppPath(effectiveRole, ownerId, pathname, user?.email);
  const needsCompanyRedirect = destination !== pathname;
  const roleMismatch = Boolean(allowedRole && effectiveRole !== allowedRole);

  useEffect(() => {
    if (!ready || loading) return;

    if (!configured) {
      if (needsCompanyRedirect && (allowedRole === "ADMIN" || pathname === "/setup")) {
        router.replace(destination);
      }
      return;
    }

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRole && effectiveRole !== allowedRole) {
      router.replace(homePathForRole(effectiveRole));
      return;
    }

    if (needsCompanyRedirect) {
      router.replace(destination);
    }
  }, [
    allowedRole,
    configured,
    destination,
    effectiveRole,
    loading,
    needsCompanyRedirect,
    pathname,
    ready,
    router,
    user,
  ]);

  if (!configured) {
    if (needsCompanyRedirect && (allowedRole === "ADMIN" || pathname === "/setup")) {
      return (
        <div className="flex min-h-full flex-1 items-center justify-center">
          <LoadingState label="Opening setup…" />
        </div>
      );
    }
    return <>{children}</>;
  }

  if (loading || !ready || !user || roleMismatch || needsCompanyRedirect) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <LoadingState label="Checking session…" />
      </div>
    );
  }

  return <>{children}</>;
}
