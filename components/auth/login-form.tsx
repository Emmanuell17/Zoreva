"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  getAuthErrorMessage,
  getStoredRole,
  homePathForRole,
} from "@/lib/firebase/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { signInWithGoogle, configured, redirectError, clearRedirectError } =
    useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setAuthError(null);
    clearRedirectError();

    if (!configured) {
      setAuthError(
        "Firebase is not configured. Add your keys to .env.local and restart the app.",
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const next = searchParams.get("next");
      const returnTo =
        next && next.startsWith("/")
          ? next
          : homePathForRole(getStoredRole());
      await signInWithGoogle(undefined, returnTo);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Log in
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with Google to manage availability and shifts.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <GoogleSignInButton
          loading={googleLoading}
          onClick={handleGoogleSignIn}
        />

        {authError || redirectError ? (
          <p className="text-xs text-red-400">{authError ?? redirectError}</p>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        No account?{" "}
        <Link
          href="/register"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Get started
        </Link>
      </p>
    </div>
  );
}
