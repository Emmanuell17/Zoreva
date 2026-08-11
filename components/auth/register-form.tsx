"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const [values, setValues] = useState<RegisterValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [touched, setTouched] = useState<
    Partial<Record<RegisterFields, boolean>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof RegisterValues>(
    field: K,
    value: RegisterValues[K],
  ) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      role: true,
    });

    const nextErrors = validateRegister();
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    router.push(values.role === "MANAGER" ? "/manager" : "/employee");
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
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950",
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
