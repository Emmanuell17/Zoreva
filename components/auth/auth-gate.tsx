"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { consumeReturnTo } from "@/lib/firebase/auth";
import { ownerIdFromAuth, resolveAppPath } from "@/lib/company";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, role, loading, ready, configured } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!configured || !ready || loading || !user || redirected.current) {
      return;
    }
    redirected.current = true;
    const requested = consumeReturnTo(role);
    const ownerId = ownerIdFromAuth({ uid: user.uid, configured });
    router.replace(resolveAppPath(role, ownerId, requested));
  }, [configured, loading, ready, role, router, user]);

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
