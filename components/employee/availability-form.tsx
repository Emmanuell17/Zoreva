"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  formatWeekRange,
  formatWeekday,
  getWeekDates,
  startOfWeek,
  toDateKey,
} from "@/lib/availability";
import { cn, formatDate } from "@/lib/utils";
import type { Availability } from "@/types";

type DayDraft = {
  dateKey: string;
  available: boolean;
  note: string;
};

function createWeekDraft(weekStart: Date): DayDraft[] {
  return getWeekDates(weekStart).map((date) => ({
    dateKey: toDateKey(date),
    available: true,
    note: "",
  }));
}

export function AvailabilityForm() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [draftByWeek, setDraftByWeek] = useState<Record<string, DayDraft[]>>(
    () => {
      const start = startOfWeek();
      return { [toDateKey(start)]: createWeekDraft(start) };
    },
  );
  const [submitted, setSubmitted] = useState<Availability[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const weekKey = toDateKey(weekStart);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const draft = draftByWeek[weekKey] ?? createWeekDraft(weekStart);

  function ensureDraft(nextWeekStart: Date) {
    const key = toDateKey(nextWeekStart);
    setDraftByWeek((current) => {
      if (current[key]) return current;
      return { ...current, [key]: createWeekDraft(nextWeekStart) };
    });
  }

  function goToWeek(offset: number) {
    const next = addDays(weekStart, offset * 7);
    ensureDraft(next);
    setWeekStart(next);
    setStatusMessage(null);
  }

  function updateDay(
    dateKey: string,
    patch: Partial<Pick<DayDraft, "available" | "note">>,
  ) {
    setDraftByWeek((current) => {
      const existing = current[weekKey] ?? createWeekDraft(weekStart);
      return {
        ...current,
        [weekKey]: existing.map((day) =>
          day.dateKey === dateKey ? { ...day, ...patch } : day,
        ),
      };
    });
    setStatusMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const entries: Availability[] = draft.map((day) => ({
      id: `avail_${day.dateKey}`,
      employeeId: "emp_demo_1",
      date: day.dateKey,
      available: day.available,
      note: day.note.trim() || null,
    }));

    setSubmitted((current) => {
      const weekKeys = new Set(entries.map((entry) => String(entry.date)));
      const remaining = current.filter(
        (entry) => !weekKeys.has(String(entry.date)),
      );
      return [...remaining, ...entries].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      );
    });

    setStatusMessage(`Availability saved for ${formatWeekRange(weekStart)}.`);
  }

  const submittedThisWeek = submitted.filter((entry) =>
    draft.some((day) => day.dateKey === String(entry.date)),
  );

  return (
    <div className="grid gap-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-zinc-800 bg-surface"
      >
        <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Weekly availability
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatWeekRange(weekStart)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goToWeek(-1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const todayWeek = startOfWeek();
                ensureDraft(todayWeek);
                setWeekStart(todayWeek);
                setStatusMessage(null);
              }}
            >
              This week
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goToWeek(1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="divide-y divide-zinc-800">
          {weekDates.map((date, index) => {
            const day = draft[index];
            const dateKey = day.dateKey;

            return (
              <div
                key={dateKey}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-40">
                  <p className="text-sm font-medium text-foreground">
                    {formatWeekday(date)}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(date)}</p>
                </div>

                <div className="flex flex-1 flex-col gap-3 sm:max-w-md">
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label={`Availability for ${formatWeekday(date)}`}
                  >
                    <button
                      type="button"
                      onClick={() => updateDay(dateKey, { available: true })}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        day.available
                          ? "border-zinc-500 bg-zinc-900 text-foreground"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-foreground",
                      )}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDay(dateKey, { available: false })}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        !day.available
                          ? "border-zinc-500 bg-zinc-900 text-foreground"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-foreground",
                      )}
                    >
                      Unavailable
                    </button>
                  </div>
                  <Input
                    label="Note (optional)"
                    name={`note-${dateKey}`}
                    value={day.note}
                    onChange={(event) =>
                      updateDay(dateKey, { note: event.target.value })
                    }
                    placeholder="e.g. Only after 2pm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {statusMessage ? (
            <p className="text-xs text-emerald-300">{statusMessage}</p>
          ) : (
            <p className="text-xs text-zinc-600">
              Frontend only — changes stay in this session.
            </p>
          )}
          <Button type="submit" className="sm:w-auto">
            Save availability
          </Button>
        </div>
      </form>

      {submittedThisWeek.length > 0 ? (
        <div className="rounded-md border border-zinc-800">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Submitted this week
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Summary of what managers will see for this week.
            </p>
          </div>
          <ul className="divide-y divide-zinc-800">
            {submittedThisWeek.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-foreground">
                    {formatDate(entry.date)}
                  </p>
                  {entry.note ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{entry.note}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    entry.available ? "text-emerald-300" : "text-zinc-500",
                  )}
                >
                  {entry.available ? "Available" : "Unavailable"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
