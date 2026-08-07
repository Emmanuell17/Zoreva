"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const [role, setRole] = useState<Role>("EMPLOYEE");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(role === "MANAGER" ? "/manager" : "/employee");
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

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          minLength={8}
          required
        />

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
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => setRole(option.value)}
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

        <Button type="submit" className="mt-2 w-full">
          Create account
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
