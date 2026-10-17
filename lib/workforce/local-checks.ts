import { firstValue, type WorkforceRow, type WorkforceTable } from "@/lib/workforce/parse";
import { hoursBetween } from "@/lib/shift-utils";
import type { LocalWorkforceFindings } from "@/lib/workforce/types";

export type { LocalWorkforceFindings };

const NAME_KEYS = ["name", "employee", "employee_name", "worker", "full_name"];
const EMAIL_KEYS = ["email", "email_address"];
const ID_KEYS = ["employee_id", "id", "staff_id"];
const DATE_KEYS = ["date", "shift_date", "day"];
const START_KEYS = ["start", "start_time", "from"];
const END_KEYS = ["end", "end_time", "to"];
const SLOTS_KEYS = ["slots", "needed", "required", "headcount"];

function looksLikeDate(value: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function looksLikeTime(value: string): boolean {
  return /^\d{1,2}:\d{2}/.test(value);
}

export function localWorkforceChecks(table: WorkforceTable): LocalWorkforceFindings {
  const missingInformation: string[] = [];
  const inconsistentRecords: Array<{ row: number; issue: string }> = [];
  const staffingIssues: string[] = [];

  const missingName = table.rows.filter((row) => !firstValue(row, NAME_KEYS)).length;
  const missingEmail = table.rows.filter((row) => !firstValue(row, EMAIL_KEYS)).length;
  const missingDate = table.rows.filter((row) => !firstValue(row, DATE_KEYS)).length;
  const missingStart = table.rows.filter((row) => !firstValue(row, START_KEYS)).length;
  const missingEnd = table.rows.filter((row) => !firstValue(row, END_KEYS)).length;

  if (missingName) missingInformation.push(`${missingName} row(s) are missing a name.`);
  if (missingEmail) missingInformation.push(`${missingEmail} row(s) are missing an email.`);
  if (missingDate) missingInformation.push(`${missingDate} row(s) are missing a shift date.`);
  if (missingStart || missingEnd) {
    missingInformation.push(
      `${missingStart + missingEnd} time field(s) are blank (start or end).`,
    );
  }

  const seenIds = new Map<string, number>();
  const byPersonDay = new Map<string, WorkforceRow[]>();

  for (const row of table.rows) {
    const id = firstValue(row, ID_KEYS);
    if (id) {
      const previous = seenIds.get(id);
      if (previous) {
        inconsistentRecords.push({
          row: row.row,
          issue: `Employee id ${id} also appears on row ${previous}.`,
        });
      } else {
        seenIds.set(id, row.row);
      }
    }

    const date = firstValue(row, DATE_KEYS);
    if (date && !looksLikeDate(date)) {
      inconsistentRecords.push({ row: row.row, issue: `Date "${date}" is not a valid date.` });
    }

    const start = firstValue(row, START_KEYS);
    const end = firstValue(row, END_KEYS);
    if (start && !looksLikeTime(start)) {
      inconsistentRecords.push({ row: row.row, issue: `Start time "${start}" is not HH:MM.` });
    }
    if (end && !looksLikeTime(end)) {
      inconsistentRecords.push({ row: row.row, issue: `End time "${end}" is not HH:MM.` });
    }
    if (looksLikeTime(start) && looksLikeTime(end) && hoursBetween(start, end) <= 0) {
      inconsistentRecords.push({
        row: row.row,
        issue: `End time ${end} is not after start time ${start}.`,
      });
    }

    const person = firstValue(row, NAME_KEYS) || firstValue(row, ID_KEYS) || `row-${row.row}`;
    if (date) {
      const key = `${person}|${date}`;
      const list = byPersonDay.get(key) ?? [];
      list.push(row);
      byPersonDay.set(key, list);
    }
  }

  for (const [key, rows] of byPersonDay) {
    if (rows.length < 2) continue;
    const person = key.split("|")[0];
    staffingIssues.push(
      `${person} is listed ${rows.length} times on the same date (rows ${rows.map((row) => row.row).join(", ")}).`,
    );
  }

  const byDate = new Map<string, number>();
  for (const row of table.rows) {
    const date = firstValue(row, DATE_KEYS);
    const slots = Number(firstValue(row, SLOTS_KEYS));
    if (!date || !Number.isFinite(slots)) continue;
    byDate.set(date, (byDate.get(date) ?? 0) + slots);
  }
  for (const [date, slots] of byDate) {
    if (slots > 40) {
      staffingIssues.push(`${date} asks for ${slots} people, which looks unusually high.`);
    }
    if (slots === 0) {
      staffingIssues.push(`${date} has shifts with 0 people needed.`);
    }
  }

  return {
    rowCount: table.rows.length,
    missingInformation,
    inconsistentRecords: inconsistentRecords.slice(0, 50),
    staffingIssues: staffingIssues.slice(0, 50),
  };
}
