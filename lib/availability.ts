export function startOfWeek(date: Date = new Date()): Date {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

export function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDates(weekStart: Date): Date[] {
  const start = startOfWeek(weekStart);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function formatWeekRange(weekStart: Date): string {
  const start = startOfWeek(weekStart);
  const end = addDays(start, 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}
