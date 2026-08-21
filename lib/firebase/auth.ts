import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/config";
import type { Role } from "@/types";

const ROLE_STORAGE_KEY = "zoreva:role";
const PENDING_ROLE_KEY = "zoreva:pendingRole";
const AUTH_RETURN_KEY = "zoreva:authReturn";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Starts Google sign-in via full-page redirect (avoids popup blockers).
 * The page will navigate away; completion is handled by completeGoogleRedirect().
 */
export async function startGoogleSignIn(options?: {
  role?: Role;
  returnTo?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;

  if (options?.role) {
    window.sessionStorage.setItem(PENDING_ROLE_KEY, options.role);
  }
  if (options?.returnTo?.startsWith("/")) {
    window.sessionStorage.setItem(AUTH_RETURN_KEY, options.returnTo);
  }

  const auth = getFirebaseAuth();
  await signInWithRedirect(auth, googleProvider);
}

export type GoogleRedirectResult = {
  user: User;
  role: Role;
  returnTo: string | null;
};

export async function completeGoogleRedirect(): Promise<GoogleRedirectResult | null> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const pendingRole = window.sessionStorage.getItem(PENDING_ROLE_KEY);
  window.sessionStorage.removeItem(PENDING_ROLE_KEY);

  const returnTo = window.sessionStorage.getItem(AUTH_RETURN_KEY);
  window.sessionStorage.removeItem(AUTH_RETURN_KEY);

  const role: Role =
    pendingRole === "MANAGER" || pendingRole === "EMPLOYEE"
      ? pendingRole
      : getStoredRole() ?? "EMPLOYEE";

  setStoredRole(role);

  return {
    user: result.user,
    role,
    returnTo: returnTo?.startsWith("/") ? returnTo : null,
  };
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function getStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (value === "EMPLOYEE" || value === "MANAGER") return value;
  return null;
}

export function setStoredRole(role: Role): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function clearStoredRole(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ROLE_STORAGE_KEY);
}

export function homePathForRole(role: Role | null): string {
  return role === "MANAGER" ? "/manager" : "/employee";
}

export function getAuthErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "Something went wrong. Please try again.";
  }

  const code = String((error as { code?: string }).code);

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Try again — sign-in now uses a full-page redirect.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth settings.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in the Firebase console.";
    default:
      return "Could not sign in with Google. Please try again.";
  }
}
