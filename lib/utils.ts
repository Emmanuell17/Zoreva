import type { HoursStatus, SignupStatus } from "@/types";
import { toDate } from "@/lib/shift-utils";

export function formatDate(date: Date | string): string {
  return toDate(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDayLabel(date: Date | string): string {
  const value = startOfLocalDay(toDate(date));
  const today = startOfLocalDay(new Date());
  const diffDays = Math.round(
    (value.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return toDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

export function getSignupStatusLabel(status: SignupStatus): string {
  return status === "CONFIRMED" ? "Confirmed" : "Not confirmed";
}

export function getHoursStatusLabel(status: HoursStatus): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "CHECK_PAPER":
      return "Check paper";
  }
}

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function startOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}
