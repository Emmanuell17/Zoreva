"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateShiftForm } from "@/components/admin/create-shift-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useCompany } from "@/hooks/use-company";
import { useSchedule } from "@/hooks/use-schedule";
import { shiftRosterText, unconfirmedListText } from "@/lib/copy-text";
import { getEmployeeName } from "@/lib/services";
import {
  approveMatchingHours,
  createShifts,
  type CreateShiftInput,
} from "@/lib/services/schedule";
import {
  isTodayShift,
  isUpcomingShift,
  remainingSlots,
  signupsForShift,
  startOfDay,
  toDate,
} from "@/lib/shift-utils";
import { formatDayLabel, formatTimeRange } from "@/lib/utils";

export function AdminDashboard() {
  const loading = useInitialLoading();
  const company = useCompany();
  const { shifts, signups, hours } = useSchedule();
  const [createOpen, setCreateOpen] = useState(false);

  const todayShifts = shifts.filter((shift) => isTodayShift(shift));
  const upcoming = shifts.filter((shift) => isUpcomingShift(shift));
  const nextDay = upcoming[0]
    ? startOfDay(toDate(upcoming[0].date)).getTime()
    : null;
  const focusShifts =
    todayShifts.length > 0
      ? todayShifts
      : upcoming.filter(
          (shift) => startOfDay(toDate(shift.date)).getTime() === nextDay,
        );
  const focusTitle =
    todayShifts.length > 0
      ? "Today"
      : focusShifts[0]
        ? formatDayLabel(focusShifts[0].date)
        : "Next";

  const unconfirmed = signups.filter((signup) => {
    const shift = shifts.find((item) => item.id === signup.shiftId);
    return signup.status !== "CONFIRMED" && shift && isUpcomingShift(shift);
  });
  const hoursToReview = hours.filter((entry) => entry.status === "SUBMITTED");
  const matchingHours = hoursToReview.filter((entry) => {
    const shift = shifts.find((item) => item.id === entry.shiftId);
    return (
      shift &&
      entry.startTime === shift.startTime &&
      entry.endTime === shift.endTime
    );
  });

  const dayCopy = focusShifts
    .map((shift) => shiftRosterText(shift, signups))
    .join("\n\n");

  const unconfirmedCopy = unconfirmedListText(
    unconfirmed.flatMap((signup) => {
      const shift = shifts.find((item) => item.id === signup.shiftId);
      if (!shift) return [];
      return [
        {
          name: getEmployeeName(signup.employeeId),
          when: `${formatDayLabel(shift.date)} ${shift.label ?? ""} ${formatTimeRange(shift.startTime, shift.endTime)}`.trim(),
        },
      ];
    }),
  );

  return (
    <div>
      <PageHeader
        title={company?.companyName ?? "Home"}
        description="Who is working next."
        actions={
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            Create shifts
          </Button>
        }
      />

      <div className="grid gap-5">
        {loading ? (
          <LoadingState variant="cards" rows={2} label="Loading overview" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{focusTitle}</CardTitle>
                    <CardDescription>
                      {todayShifts.length > 0
                        ? "People on the roster today."
                        : "The next day with shifts."}
                    </CardDescription>
                  </div>
                  {focusShifts.length > 0 ? (
                    <CopyButton text={dayCopy} label="Copy" />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {focusShifts.length === 0 ? (
                  <EmptyState
                    compact
                    className="px-0 py-4"
                    title="No shifts yet"
                    description="Create a shift so people can choose it."
                    action={
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Create shifts
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {focusShifts.map((shift) => {
                      const people = signupsForShift(signups, shift.id);
                      const taken = people.length;
                      const open = remainingSlots(shift, signups);

                      return (
                        <li key={shift.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {shift.label ?? "Shift"} ·{" "}
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {taken === 0
                              ? `Nobody yet · ${open} ${open === 1 ? "spot" : "spots"} open`
                              : `${taken} of ${shift.slots} people${
                                  people.some((signup) => signup.status !== "CONFIRMED")
                                    ? " · some not confirmed"
                                    : ""
                                }`}
                          </p>
                          {people.length > 0 ? (
                            <p className="mt-1 text-xs text-zinc-400">
                              {people
                                .map((signup) => getEmployeeName(signup.employeeId))
                                .join(", ")}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {upcoming.length > 0 ? (
                  <p className="mt-3 text-xs text-zinc-600">
                    <Link
                      href="/admin/shifts"
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      See all shifts
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {unconfirmed.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Need to confirm</CardTitle>
                      <CardDescription>
                        {unconfirmed.length}{" "}
                        {unconfirmed.length === 1 ? "person has" : "people have"}{" "}
                        not confirmed yet.
                      </CardDescription>
                    </div>
                    <CopyButton text={unconfirmedCopy} label="Copy names" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {unconfirmed.slice(0, 8).map((signup) => {
                      const shift = shifts.find(
                        (item) => item.id === signup.shiftId,
                      );
                      if (!shift) return null;

                      return (
                        <li key={signup.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {getEmployeeName(signup.employeeId)}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {formatDayLabel(shift.date)} ·{" "}
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {hoursToReview.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Hours to check</CardTitle>
                      <CardDescription>
                        {hoursToReview.length}{" "}
                        {hoursToReview.length === 1 ? "entry" : "entries"} waiting.
                      </CardDescription>
                    </div>
                    {matchingHours.length > 0 ? (
                      <Button size="sm" onClick={() => approveMatchingHours()}>
                        Approve {matchingHours.length} matching
                      </Button>
                    ) : (
                      <Link href="/admin/hours">
                        <Button size="sm" variant="secondary">
                          Open hours
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {hoursToReview.slice(0, 6).map((entry) => {
                      const shift = shifts.find(
                        (item) => item.id === entry.shiftId,
                      );
                      if (!shift) return null;

                      return (
                        <li key={entry.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {getEmployeeName(entry.employeeId)}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {formatDayLabel(shift.date)} ·{" "}
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>

      <CreateShiftForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(inputs: CreateShiftInput[]) => createShifts(inputs)}
      />
    </div>
  );
}
