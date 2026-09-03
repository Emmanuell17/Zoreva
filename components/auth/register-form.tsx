"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getAuthErrorMessage, homePathForRole } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const roles: { value: Role; label: string; description: string }[] = [
  {
    value: "EMPLOYEE",
    label: "Employee",
    description: "Share availability and view your shifts",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Coordinate coverage and assign shifts",
  },
];

export function RegisterForm() {
  const { signInWithGoogle, configured, redirectError, clearRedirectError } =
    useAuth();
  const [role, setRole] = useState<Role>("EMPLOYEE");
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
      await signInWithGoogle(role, homePathForRole(role));
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
          Choose your role, then continue with Google.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2 text-left">
          <legend className="text-xs font-medium text-zinc-400">Role</legend>
          <div className="grid gap-2">
            {roles.map((option) => {
              const selected = role === option.value;

              return (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-3 transition-colors",
                    selected
                      ? "border-zinc-500 bg-zinc-900"
                      : "border-border hover:border-zinc-700 hover:bg-zinc-950",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      setRole(option.value);
                      setAuthError(null);
                      clearRedirectError();
                    }}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

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
