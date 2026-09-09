import { getEmployeeName } from "@/lib/services/employees";
import {
  remainingSlots,
  signupsForShift,
} from "@/lib/shift-utils";
import { formatDayLabel, formatTimeRange } from "@/lib/utils";
import type { Shift, ShiftSignup } from "@/types";

export function shiftRosterText(
  shift: Shift,
  signups: ShiftSignup[],
): string {
  const people = signupsForShift(signups, shift.id);
  const coming = people
    .filter((signup) => signup.status === "CONFIRMED")
    .map((signup) => getEmployeeName(signup.employeeId));
  const waiting = people
    .filter((signup) => signup.status !== "CONFIRMED")
    .map((signup) => getEmployeeName(signup.employeeId));
  const open = remainingSlots(shift, signups);

  return [
    `${formatDayLabel(shift.date)} · ${shift.label ?? "Shift"} · ${formatTimeRange(shift.startTime, shift.endTime)}`,
    coming.length > 0 ? `Coming: ${coming.join(", ")}` : "Coming: —",
    waiting.length > 0 ? `Not confirmed: ${waiting.join(", ")}` : null,
    open > 0 ? `Open spots: ${open}` : "Full",
  ]
    .filter(Boolean)
    .join("\n");
}

export function unconfirmedListText(
  rows: Array<{ name: string; when: string }>,
): string {
  if (rows.length === 0) return "Everyone has confirmed.";
  return [
    "Please confirm your shift:",
    ...rows.map((row) => `${row.name} — ${row.when}`),
  ].join("\n");
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
