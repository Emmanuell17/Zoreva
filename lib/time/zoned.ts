import { addCivilDays, clockMinutes } from "@/lib/time/interval";

/**
 * Wall-clock shifts do not store a device offset.
 * Overlap uses civil minutes from `lib/time/interval.ts`.
 * "Has this shift finished?" is a UTC instant: the wall-clock end in the
 * company's IANA timezone. Companies created from now on store that zone.
 * A company with no zone uses UTC, not the viewer's device zone.
 * Existing `endAt` values are left as stored. They are not rewritten.
 */
export const DEFAULT_BUSINESS_TIMEZONE = "UTC";

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 63) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function detectedTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isValidTimeZone(zone) ? zone : DEFAULT_BUSINESS_TIMEZONE;
  } catch {
    return DEFAULT_BUSINESS_TIMEZONE;
  }
}

function zoneOffsetMs(utcMillis: number, timeZone: string): number | null {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMillis));
  const part = (type: string) => formatted.find((item) => item.type === type)?.value;
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));
  const second = Number(part("second"));
  if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) return null;
  return Date.UTC(year, month - 1, day, hour === 24 ? 0 : hour, minute, second) - utcMillis;
}

function wallParts(utcMillis: number, timeZone: string): string | null {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(utcMillis));
  const part = (type: string) => formatted.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  if (!year || !month || !day || !hour || !minute) return null;
  const normalizedHour = hour === "24" ? "00" : hour;
  return `${year}-${month}-${day} ${normalizedHour}:${minute}`;
}

export function zonedWallTimeToUtc(date: string, time: string, timeZone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidTimeZone(timeZone)) return null;
  const minutes = clockMinutes(time);
  if (minutes === null) return null;
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const first = zoneOffsetMs(guess, timeZone);
  if (first === null) return null;
  let utc = guess - first;
  const second = zoneOffsetMs(utc, timeZone);
  if (second === null) return null;
  utc = guess - second;
  const wanted = `${date} ${time}`;
  const shown = wallParts(utc, timeZone);
  if (shown === wanted) return utc;
  if (!shown) return utc;
  const wantedUtc = Date.UTC(year, month - 1, day, hour, minute);
  const [shownDate, shownTime] = shown.split(" ");
  const shownMinutes = clockMinutes(shownTime ?? "");
  if (!shownDate || shownMinutes === null) return utc;
  const [shownYear, shownMonth, shownDay] = shownDate.split("-").map(Number);
  const shownUtc = Date.UTC(
    shownYear,
    shownMonth - 1,
    shownDay,
    Math.floor(shownMinutes / 60),
    shownMinutes % 60,
  );
  const adjusted = utc + (wantedUtc - shownUtc);
  if (wallParts(adjusted, timeZone) === wanted) return adjusted;
  return wantedUtc > shownUtc ? adjusted : utc;
}

export function shiftEndUtc(
  date: string,
  startTime: string,
  endTime: string,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): number | null {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  if (start === null || end === null) return null;
  const endDate = end <= start ? addCivilDays(date, 1) : date;
  if (!endDate) return null;
  return zonedWallTimeToUtc(endDate, endTime, timeZone);
}
