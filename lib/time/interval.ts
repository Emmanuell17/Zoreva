/**
 * Time policy for Zoreva. There is no company timezone setting.
 *
 * A date is a civil day `YYYY-MM-DD`. A time is a wall-clock `HH:mm`.
 * Documents do not store a timezone offset. Overlap uses civil minutes:
 * every date has 1440 minutes, including days when a local clock skips or
 * repeats an hour. An end clock earlier than or equal to the start clock
 * finishes at that time on the next civil day. `00:00` as an end time is
 * the next midnight. Touching endpoints do not overlap.
 *
 * "Has this shift finished?" is the UTC instant of that wall-clock end in the
 * company's IANA timezone. A company with no timezone uses UTC, not the
 * viewer's device. Stored `endAt` values are not rewritten.
 */

const DAY_MINUTES = 24 * 60;

export function clockMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeClock(value: string): string | null {
  const minutes = clockMinutes(value);
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function civilDayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return Math.floor(utc / 86_400_000);
}

export function weekdayForDate(date: string): number | null {
  const day = civilDayNumber(date);
  if (day === null) return null;
  return new Date(Date.UTC(1970, 0, 1 + day)).getUTCDay();
}

export type CivilInterval = {
  start: number;
  end: number;
};

export function civilInterval(
  date: string,
  startTime: string,
  endTime: string,
): CivilInterval | null {
  const day = civilDayNumber(date);
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  if (day === null || start === null || end === null) return null;
  const startAbs = day * DAY_MINUTES + start;
  let endAbs = day * DAY_MINUTES + end;
  if (end <= start) endAbs += DAY_MINUTES;
  return { start: startAbs, end: endAbs };
}

export function wholeDaysInterval(startDate: string, endDate: string): CivilInterval | null {
  const start = civilDayNumber(startDate);
  const end = civilDayNumber(endDate);
  if (start === null || end === null || end < start) return null;
  return { start: start * DAY_MINUTES, end: (end + 1) * DAY_MINUTES };
}

export function intervalsOverlap(a: CivilInterval, b: CivilInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function shiftsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string },
): boolean {
  const left = civilInterval(a.date, a.startTime, a.endTime);
  const right = civilInterval(b.date, b.startTime, b.endTime);
  if (!left || !right) return false;
  return intervalsOverlap(left, right);
}

export function intervalContains(outer: CivilInterval, inner: CivilInterval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

export function addCivilDays(date: string, days: number): string | null {
  const day = civilDayNumber(date);
  if (day === null) return null;
  const next = new Date((day + days) * 86_400_000);
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dateNum = String(next.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dateNum}`;
}
