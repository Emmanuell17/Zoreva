import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getRedirectResult,
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
const AWAITING_GOOGLE_KEY = "zoreva:awaitingGoogle";
const GOOGLE_ATTEMPT_KEY = "zoreva:googleAttemptAt";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let redirectResultPromise: Promise<GoogleRedirectResult | null> | null = null;
let awaitingGoogleConsumed: boolean | null = null;

function readyAuth() {
  return getFirebaseAuth();
}

function writeStored(key: string, value: string) {
  window.sessionStorage.setItem(key, value);
  window.localStorage.setItem(key, value);
}

function readStored(key: string): string | null {
  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
}

function removeStored(key: string) {
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

export function isIpAddress(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  return hostname.includes(":");
}

export function usesRedirectGoogleSignIn(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS || /Android/i.test(ua)) return true;
  return /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|Twitter|LinkedInApp|WhatsApp|MicroMessenger/i.test(
    ua,
  );
}

export function recentGoogleRedirectAttempt(withinMs = 120_000): boolean {
  if (typeof window === "undefined") return false;
  const at = Number(window.localStorage.getItem(GOOGLE_ATTEMPT_KEY) || 0);
  return Number.isFinite(at) && at > 0 && Date.now() - at < withinMs;
}

export function markAwaitingGoogleRedirect() {
  if (typeof window === "undefined") return;
  awaitingGoogleConsumed = null;
  window.localStorage.setItem(AWAITING_GOOGLE_KEY, "1");
  window.localStorage.setItem(GOOGLE_ATTEMPT_KEY, String(Date.now()));
}

export function consumeAwaitingGoogleRedirect(): boolean {
  if (typeof window === "undefined") return false;
  if (awaitingGoogleConsumed !== null) return awaitingGoogleConsumed;
  const pending = window.localStorage.getItem(AWAITING_GOOGLE_KEY) === "1";
  window.localStorage.removeItem(AWAITING_GOOGLE_KEY);
  awaitingGoogleConsumed = pending;
  return pending;
}

export function cancelAwaitingGoogleRedirect() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AWAITING_GOOGLE_KEY);
  awaitingGoogleConsumed = false;
}

function assertSupportedSignInHost() {
  const host = window.location.hostname;
  if (!isIpAddress(host)) return;
  const error = new Error("auth/unauthorized-domain") as Error & { code: string };
  error.code = "auth/unauthorized-domain";
  throw error;
}

function storeSignInOptions(options?: { role?: Role; returnTo?: string }) {
  if (typeof window === "undefined") return;

  if (options?.role) {
    writeStored(PENDING_ROLE_KEY, options.role);
  }
  if (options?.returnTo && isAppPath(options.returnTo)) {
    writeStored(AUTH_RETURN_KEY, options.returnTo);
  }
}

export function peekPendingRole(): Role | null {
  if (typeof window === "undefined") return null;
  return parseRole(readStored(PENDING_ROLE_KEY));
}

function applyPendingRole(): Role {
  const pendingRole = readStored(PENDING_ROLE_KEY);
  removeStored(PENDING_ROLE_KEY);
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

  const stored = readStored(AUTH_RETURN_KEY);
  removeStored(AUTH_RETURN_KEY);
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
  const redirect = usesRedirectGoogleSignIn();

  if (redirect) {
    assertSupportedSignInHost();
    markAwaitingGoogleRedirect();
    try {
      await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
    } catch (error) {
      cancelAwaitingGoogleRedirect();
      throw error;
    }
    return null;
  }

  try {
    const result = await signInWithPopup(
      auth,
      googleProvider,
      browserPopupRedirectResolver,
    );
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

    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      assertSupportedSignInHost();
      markAwaitingGoogleRedirect();
      try {
        await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
      } catch (redirectError) {
        cancelAwaitingGoogleRedirect();
        throw redirectError;
      }
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
      const result = await getRedirectResult(auth, browserPopupRedirectResolver);
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
    case "auth/unauthorized-domain": {
      const host =
        typeof window === "undefined" ? "" : window.location.hostname;
      if (isIpAddress(host)) {
        return `Google sign-in can't finish from ${host}. On this computer, open localhost. On a phone, use the https site after that domain is added in Firebase Authentication → Authorized domains.`;
      }
      return "This domain is not authorized in Firebase Auth settings.";
    }
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in the Firebase console.";
    default:
      return "Could not sign in with Google. Please try again.";
  }
}
