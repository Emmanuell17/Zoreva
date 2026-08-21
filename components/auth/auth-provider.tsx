"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
  redirectError: string | null;
  signInWithGoogle: (role?: Role, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: Role) => void;
  clearRedirectError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(configured);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    let unsubscribe = () => {};

    async function init() {
      try {
        const completed = await completeGoogleRedirect();
        if (completed) {
          setUser(completed.user);
          setRoleState(completed.role);
          setLoading(false);
          router.replace(
            completed.returnTo ?? homePathForRole(completed.role),
          );
        }
      } catch (error) {
        setRedirectError(getAuthErrorMessage(error));
      }

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setRoleState(nextUser ? getStoredRole() : null);
        setLoading(false);
      });
    }

    void init();

    return () => unsubscribe();
  }, [configured, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      configured,
      redirectError,
      async signInWithGoogle(nextRole, returnTo) {
        await startGoogleSignIn({
          role: nextRole,
          returnTo:
            returnTo ??
            homePathForRole(nextRole ?? getStoredRole() ?? "EMPLOYEE"),
        });
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
    [user, role, loading, configured, redirectError],
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
