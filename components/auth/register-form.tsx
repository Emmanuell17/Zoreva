"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { RolePicker } from "@/components/auth/role-picker";
import { SETUP_PATH } from "@/lib/company/defaults";
import { getAuthErrorMessage, homePathForRole } from "@/lib/firebase/auth";
import type { Role } from "@/types";

export function RegisterForm() {
  const { signInWithGoogle, configured, redirectError, clearRedirectError } =
    useAuth();
  const [role, setRole] = useState<Role>("ADMIN");
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
      await signInWithGoogle(
        role,
        role === "ADMIN" ? SETUP_PATH : homePathForRole(role),
      );
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Get started
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose Manager or Employee, then continue with Google.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <RolePicker
          value={role}
          onChange={(nextRole) => {
            setRole(nextRole);
            setAuthError(null);
            clearRedirectError();
          }}
        />

        <GoogleSignInButton
          loading={googleLoading}
          label="Continue with Google"
          onClick={handleGoogleSignIn}
        />

        {authError || redirectError ? (
          <p className="text-xs text-red-400">{authError ?? redirectError}</p>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
