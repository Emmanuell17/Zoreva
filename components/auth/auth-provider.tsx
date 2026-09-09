"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  clearStoredRole,
  completeGoogleRedirect,
  getAuthErrorMessage,
  getStoredRole,
  homePathForRole,
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
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(configured);
  const [ready, setReady] = useState(!configured);
  const [redirectError, setRedirectError] = useState<string | null>(null);

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
        setUser(nextUser);
        setRoleState(nextUser ? getStoredRole() : null);
        setLoading(false);
        setReady(true);
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
        setRoleState(null);
        setUser(null);
      },
      setRole(nextRole) {
        setStoredRole(nextRole);
        setRoleState(nextRole);
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
