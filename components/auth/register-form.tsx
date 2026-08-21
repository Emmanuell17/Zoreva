"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAuthErrorMessage,
  homePathForRole,
} from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";
import {
  hasFieldErrors,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
  type FieldErrors,
} from "@/lib/validation";
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

type RegisterFields = "name" | "email" | "password" | "confirmPassword" | "role";

type RegisterValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
};

const initialValues: RegisterValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "EMPLOYEE",
};

export function RegisterForm() {
  const { signInWithGoogle, configured, redirectError, clearRedirectError } =
    useAuth();
  const [values, setValues] = useState<RegisterValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [touched, setTouched] = useState<
    Partial<Record<RegisterFields, boolean>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  function setField<K extends keyof RegisterValues>(
    field: K,
    value: RegisterValues[K],
  ) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setAuthError(null);
    clearRedirectError();

    if (touched[field as RegisterFields] || errors[field as RegisterFields]) {
      setErrors(validateRegister(nextValues));
    }
  }

  function validateRegister(nextValues: RegisterValues = values) {
    return {
      name: validateName(nextValues.name),
      email: validateEmail(nextValues.email),
      password: validatePassword(nextValues.password),
      confirmPassword: validatePasswordMatch(
        nextValues.password,
        nextValues.confirmPassword,
      ),
      role: nextValues.role ? undefined : "Select a role.",
    } satisfies FieldErrors<RegisterFields>;
  }

  async function handleGoogleSignIn() {
    setAuthError(null);
    clearRedirectError();
    setTouched((current) => ({ ...current, role: true }));

    if (!values.role) {
      setErrors((current) => ({ ...current, role: "Select a role." }));
      return;
    }

    if (!configured) {
      setAuthError(
        "Firebase is not configured. Add your keys to .env.local and restart the app.",
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithGoogle(values.role, homePathForRole(values.role));
      // Redirect navigates away; keep loading state if it doesn't.
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      role: true,
    });
    setAuthError(null);

    const nextErrors = validateRegister();
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    setAuthError("Use Continue with Google to create your account for now.");
    setSubmitting(false);
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Create account
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Set up your Zoreva profile to get started.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 flex flex-col gap-4"
      >
        <fieldset className="flex flex-col gap-2 text-left">
          <legend className="text-xs font-medium text-zinc-400">Role</legend>
          <div className="grid gap-2">
            {roles.map((option) => {
              const selected = values.role === option.value;

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
                    onChange={() => setField("role", option.value)}
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
          {touched.role && errors.role ? (
            <p className="text-xs text-red-400">{errors.role}</p>
          ) : null}
        </fieldset>

        <GoogleSignInButton
          loading={googleLoading}
          label="Continue with Google"
          onClick={handleGoogleSignIn}
        />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Input
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          value={values.name}
          error={touched.name ? errors.name : undefined}
          onChange={(event) => setField("name", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, name: true }));
            setErrors(validateRegister());
          }}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          value={values.email}
          error={touched.email ? errors.email : undefined}
          onChange={(event) => setField("email", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, email: true }));
            setErrors(validateRegister());
          }}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password}
          error={touched.password ? errors.password : undefined}
          onChange={(event) => setField("password", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, password: true }));
            setErrors(validateRegister());
          }}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={values.confirmPassword}
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
          onChange={(event) => setField("confirmPassword", event.target.value)}
          onBlur={() => {
            setTouched((current) => ({ ...current, confirmPassword: true }));
            setErrors(validateRegister());
          }}
        />

        {(authError || redirectError) ? (
          <p className="text-xs text-red-400">{authError ?? redirectError}</p>
        ) : null}

        <Button type="submit" loading={submitting} className="mt-2 w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

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
