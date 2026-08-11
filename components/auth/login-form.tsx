"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<LoginFields>>({});
  const [touched, setTouched] = useState<Partial<Record<LoginFields, boolean>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: LoginFields, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (!validateAll()) return;

    setSubmitting(true);
    // Temporary until authentication is wired
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    router.push("/employee");
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

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 flex flex-col gap-4"
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
