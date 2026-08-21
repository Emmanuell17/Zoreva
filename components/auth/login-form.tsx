"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAuthErrorMessage,
  getStoredRole,
  homePathForRole,
} from "@/lib/firebase/auth";
import {
  hasFieldErrors,
  validateEmail,
  validatePassword,
  type FieldErrors,
} from "@/lib/validation";

type LoginFields = "email" | "password";

type LoginValues = Record<LoginFields, string>;

const initialValues: LoginValues = {
  email: "",
  password: "",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const { signInWithGoogle, configured, redirectError, clearRedirectError } =
    useAuth();
  const [values, setValues] = useState<LoginValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<LoginFields>>({});
  const [touched, setTouched] = useState<Partial<Record<LoginFields, boolean>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  function updateField(field: LoginFields, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setAuthError(null);
    clearRedirectError();
    if (touched[field] || errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]:
          field === "email"
            ? validateEmail(value)
            : validatePassword(value),
      }));
    }
  }

  function validateAll(nextValues: LoginValues = values) {
    const nextErrors: FieldErrors<LoginFields> = {
      email: validateEmail(nextValues.email),
      password: validatePassword(nextValues.password),
    };
    setErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  }

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
      // Redirect navigates away; keep loading state if it doesn't.
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setAuthError(null);

    if (!validateAll()) return;

    setSubmitting(true);
    // Email/password auth is not wired to Firebase yet — use Google sign-in.
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    setAuthError("Use Continue with Google to sign in for now.");
    setSubmitting(false);
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Log in
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in to manage availability and shifts.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <GoogleSignInButton
          loading={googleLoading}
          onClick={handleGoogleSignIn}
        />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-4 flex flex-col gap-4"
      >
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          value={values.email}
          error={touched.email ? errors.email : undefined}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, email: true }));
            setErrors((current) => ({
              ...current,
              email: validateEmail(values.email),
            }));
          }}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={values.password}
          error={touched.password ? errors.password : undefined}
          onChange={(event) => updateField("password", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, password: true }));
            setErrors((current) => ({
              ...current,
              password: validatePassword(values.password),
            }));
          }}
        />

        {(authError || redirectError) ? (
          <p className="text-xs text-red-400">{authError ?? redirectError}</p>
        ) : null}

        <Button type="submit" loading={submitting} className="mt-2 w-full">
          {submitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        No account?{" "}
        <Link
          href="/register"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
