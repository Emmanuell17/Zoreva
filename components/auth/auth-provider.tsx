"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  activateDemoWorkspace,
  activateWorkspaceForMember,
  activateWorkspaceForOwner,
  hydrateWorkspace,
  ownerIdFromAuth,
} from "@/lib/company/store";
import "@/lib/services/schedule";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  clearStoredRole,
  completeGoogleRedirect,
  getAuthErrorMessage,
  getStoredRole,
  homePathForRole,
  peekPendingRole,
  setStoredRole,
  startGoogleSignIn,
  signOut as firebaseSignOut,
} from "@/lib/firebase/auth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import type { Role } from "@/types";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  configured: boolean;
  ready: boolean;
  redirectError: string | null;
  signInWithGoogle: (
    role?: Role,
    returnTo?: string,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  setRole: (role: Role) => void;
  clearRedirectError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role | null>(() =>
    typeof window === "undefined" ? null : getStoredRole(),
  );
  const [loading, setLoading] = useState(configured);
  const [ready, setReady] = useState(!configured);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const syncGen = useRef(0);

  function syncLocalWorkspace(
    nextRole: Role | null,
    uid?: string | null,
    email?: string | null,
  ) {
    const ownerId = ownerIdFromAuth({ uid, configured });
    if (nextRole === "ADMIN" && ownerId) {
      activateWorkspaceForOwner(ownerId, email);
      return;
    }
    if (nextRole === "EMPLOYEE" && uid) {
      activateWorkspaceForMember(uid);
      return;
    }
    if (!configured && ownerId && nextRole !== "EMPLOYEE") {
      const activated = activateWorkspaceForOwner(ownerId);
      if (activated) return;
    }
    activateDemoWorkspace();
  }

  async function syncWorkspace(
    nextRole: Role | null,
    uid?: string | null,
    email?: string | null,
  ) {
    const gen = ++syncGen.current;
    syncLocalWorkspace(nextRole, uid, email);
    await hydrateWorkspace({ role: nextRole, uid, email, configured });
    return gen === syncGen.current;
  }

  useLayoutEffect(() => {
    const stored = getStoredRole();
    if (stored && stored !== role) {
      // Keep the first paint aligned with the role already stored on this device.
      queueMicrotask(() => setRoleState(stored));
    }
    syncLocalWorkspace(stored ?? role, user?.uid, user?.email);
    // First paint should already have the right company loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / configured
  }, [configured]);

  useEffect(() => {
    if (!configured) return;

    const auth = getFirebaseAuth();
    let cancelled = false;
    let unsubscribe = () => {};

    async function init() {
      try {
        await completeGoogleRedirect();
      } catch (error) {
        if (!cancelled) {
          setRedirectError(getAuthErrorMessage(error));
        }
      }

      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        const pendingRole = nextUser ? peekPendingRole() : null;
        const nextRole = nextUser ? (pendingRole ?? getStoredRole()) : null;
        if (nextUser && pendingRole) setStoredRole(pendingRole);
        void (async () => {
          await syncWorkspace(nextRole, nextUser?.uid, nextUser?.email);
          if (cancelled) return;
          setUser(nextUser);
          setRoleState(nextRole);
          setLoading(false);
          setReady(true);
        })();
      });
    }

    void init();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      configured,
      ready,
      redirectError,
      async signInWithGoogle(nextRole, returnTo) {
        const result = await startGoogleSignIn({
          role: nextRole,
          returnTo:
            returnTo ??
            homePathForRole(nextRole ?? getStoredRole() ?? "EMPLOYEE"),
        });

        if (result) {
          await syncWorkspace(result.role, result.user.uid, result.user.email);
          setUser(result.user);
          setRoleState(result.role);
          setLoading(false);
          setReady(true);
          return result.returnTo;
        }

        return null;
      },
      async signOut() {
        await firebaseSignOut();
        clearStoredRole();
        activateDemoWorkspace();
        setRoleState(null);
        setUser(null);
      },
      setRole(nextRole) {
        setStoredRole(nextRole);
        setRoleState(nextRole);
        void syncWorkspace(nextRole, user?.uid, user?.email);
      },
      clearRedirectError() {
        setRedirectError(null);
      },
    }),
    [user, role, loading, configured, ready, redirectError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
