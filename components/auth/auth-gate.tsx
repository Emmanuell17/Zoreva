"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { hasCompletedSetup, ownerIdFromAuth, resolveAppPath, SETUP_PATH } from "@/lib/company";
import { consumeReturnTo } from "@/lib/firebase/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, ready, configured, setRole } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!configured || !ready || loading || !user) {
      if (!user) redirected.current = false;
      return;
    }

    const ownerId = ownerIdFromAuth({ uid: user.uid, configured });

    // Create-account is company setup. A previous employee session must not
    // send this page to the join-code form.
    if (pathname === "/register") {
      if (role !== "ADMIN") {
        setRole("ADMIN");
        return;
      }
      if (redirected.current) return;
      redirected.current = true;
      consumeReturnTo("ADMIN");
      router.replace(
        hasCompletedSetup(ownerId, user.email) ? "/admin" : SETUP_PATH,
      );
      return;
    }

    if (redirected.current) return;
    redirected.current = true;
    const requested = consumeReturnTo(role);
    router.replace(resolveAppPath(role, ownerId, requested, user.email));
  }, [configured, loading, pathname, ready, role, router, setRole, user]);

  if (!configured) {
    return <>{children}</>;
  }

  if (!ready || loading || user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingState
          label={user ? "Opening your shifts…" : "Signing you in…"}
        />
      </div>
    );
  }

  return <>{children}</>;
}
