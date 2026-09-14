"use client";

import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export const signInRoles: { value: Role; label: string; description: string }[] = [
  {
    value: "ADMIN",
    label: "Manager",
    description: "Set up your company, create shifts, and review hours",
  },
  {
    value: "EMPLOYEE",
    label: "Employee",
    description: "Choose shifts, confirm, and enter hours",
  },
];

type RolePickerProps = {
  value: Role;
  onChange: (role: Role) => void;
};

export function RolePicker({ value, onChange }: RolePickerProps) {
  const selected = signInRoles.find((role) => role.value === value);

  return (
    <fieldset className="flex flex-col gap-2 text-left">
      <legend className="text-xs font-medium text-zinc-400">I am a</legend>
      <div className="grid grid-cols-2 gap-2">
        {signInRoles.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                isSelected
                  ? "border-zinc-500 bg-zinc-900 text-foreground"
                  : "border-border text-zinc-400 hover:border-zinc-700 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-xs text-zinc-500">{selected.description}</p>
      ) : null}
    </fieldset>
  );
}
