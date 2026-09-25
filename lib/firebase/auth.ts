import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
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

let redirectResultPromise: Promise<GoogleRedirectResult | null> | null = null;
let persistenceReady: Promise<void> | null = null;

async function readyAuth() {
  const auth = getFirebaseAuth();
  persistenceReady ??= setPersistence(auth, browserLocalPersistence).then(
    () => undefined,
    () => undefined,
  );
  await persistenceReady;
  return auth;
}

function storeSignInOptions(options?: { role?: Role; returnTo?: string }) {
  if (typeof window === "undefined") return;

  if (options?.role) {
    window.sessionStorage.setItem(PENDING_ROLE_KEY, options.role);
  }
  if (options?.returnTo && isAppPath(options.returnTo)) {
    window.sessionStorage.setItem(AUTH_RETURN_KEY, options.returnTo);
  }
}

export function peekPendingRole(): Role | null {
  if (typeof window === "undefined") return null;
  return parseRole(window.sessionStorage.getItem(PENDING_ROLE_KEY));
}

function applyPendingRole(): Role {
  const pendingRole = window.sessionStorage.getItem(PENDING_ROLE_KEY);
  window.sessionStorage.removeItem(PENDING_ROLE_KEY);
  const role: Role = parseRole(pendingRole) ?? getStoredRole() ?? "EMPLOYEE";
  setStoredRole(role);
  return role;
}

export function isAuthPath(path: string): boolean {
  return path === "/login" || path === "/register" || path.startsWith("/login?");
}

export function isAppPath(path: string): boolean {
  return path.startsWith("/") && !isAuthPath(path) && path !== "/";
}

export function consumeReturnTo(role: Role | null): string {
  if (typeof window === "undefined") return homePathForRole(role);

  const stored = window.sessionStorage.getItem(AUTH_RETURN_KEY);
  window.sessionStorage.removeItem(AUTH_RETURN_KEY);
  if (stored && isAppPath(stored)) return stored;
  return homePathForRole(role);
}

/**
 * Signs in with a popup when possible. Falls back to a full-page redirect
 * if the browser blocks the popup.
 */
export async function startGoogleSignIn(options?: {
  role?: Role;
  returnTo?: string;
}): Promise<GoogleRedirectResult | null> {
  if (typeof window === "undefined") return null;

  storeSignInOptions(options);
  const auth = await readyAuth();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const role = applyPendingRole();
    return {
      user: result.user,
      role,
      returnTo: null,
    };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      throw error;
    }

    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

export type GoogleRedirectResult = {
  user: User;
  role: Role;
  returnTo: string | null;
};

export async function completeGoogleRedirect(): Promise<GoogleRedirectResult | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      const auth = await readyAuth();
      const result = await getRedirectResult(auth);
      if (!result) return null;

      const role = applyPendingRole();
      return {
        user: result.user,
        role,
        returnTo: null,
      };
    })();
  }

  return redirectResultPromise;
}

export async function signOut(): Promise<void> {
  const auth = await readyAuth();
  await firebaseSignOut(auth);
}

export function parseRole(value: string | null | undefined): Role | null {
  if (value === "EMPLOYEE" || value === "ADMIN") return value;
  if (value === "MANAGER") return "ADMIN";
  return null;
}

export function getStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  return parseRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
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
  return role === "ADMIN" ? "/admin" : "/employee";
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
      return "Pop-up was blocked. Allow pop-ups for this site and try again.";
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
