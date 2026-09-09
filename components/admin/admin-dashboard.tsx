"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateShiftForm } from "@/components/admin/create-shift-form";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessNote } from "@/components/layout/process-note";
import { Badge } from "@/components/ui/badge";
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
  const focusTitle = todayShifts.length > 0 ? "Today" : focusShifts[0]
    ? formatDayLabel(focusShifts[0].date)
    : "Today";
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
  const openSpots = upcoming.reduce(
    (sum, shift) => sum + remainingSlots(shift, signups),
    0,
  );

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
        title="Home"
        description="Today’s roster, who still needs to confirm, and hours to check."
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

      <div className="grid gap-6">
        {loading ? (
          <LoadingState variant="cards" rows={3} label="Loading overview" />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="border-b-0 py-4">
                  <CardDescription>Not confirmed</CardDescription>
                  <CardTitle className="text-2xl">{unconfirmed.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="border-b-0 py-4">
                  <CardDescription>Hours to review</CardDescription>
                  <CardTitle className="text-2xl">{hoursToReview.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="border-b-0 py-4">
                  <CardDescription>Open spots</CardDescription>
                  <CardTitle className="text-2xl">{openSpots}</CardTitle>
                </CardHeader>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{focusTitle}</CardTitle>
                    <CardDescription>
                      {todayShifts.length > 0
                        ? "Who is on the roster today."
                        : "Next day on the roster."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {focusShifts.length === 0 ? (
                  <EmptyState
                    compact
                    className="px-0 py-4"
                    title="No upcoming shifts"
                    description="Create a shift so people can choose it."
                  />
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {focusShifts.map((shift) => {
                      const people = signupsForShift(signups, shift.id);
                      return (
                        <li key={shift.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {shift.label ?? "Shift"} ·{" "}
                                {formatTimeRange(shift.startTime, shift.endTime)}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {people.length === 0
                                  ? "Nobody chosen yet"
                                  : people
                                      .map(
                                        (signup) =>
                                          `${getEmployeeName(signup.employeeId)}${signup.status === "CONFIRMED" ? "" : " (not confirmed)"}`,
                                      )
                                      .join(", ")}
                              </p>
                            </div>
                            <CopyButton
                              text={shiftRosterText(shift, signups)}
                              label="Copy"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Waiting to confirm</CardTitle>
                    <CardDescription>
                      Copy this list to chase people on Facebook if you need to.
                    </CardDescription>
                  </div>
                  {unconfirmed.length > 0 ? (
                    <CopyButton
                      text={unconfirmedCopy}
                      label="Copy names"
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {unconfirmed.length === 0 ? (
                  <EmptyState
                    compact
                    className="px-0 py-4"
                    title="Everyone has confirmed"
                    description="New unconfirmed names will show up here."
                  />
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {unconfirmed.slice(0, 8).map((signup) => {
                      const shift = shifts.find(
                        (item) => item.id === signup.shiftId,
                      );
                      if (!shift) return null;

                      return (
                        <li
                          key={signup.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {getEmployeeName(signup.employeeId)}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {formatDayLabel(shift.date)} ·{" "}
                              {formatTimeRange(shift.startTime, shift.endTime)}
                            </p>
                          </div>
                          <Badge variant="pending">Not confirmed</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Hours waiting</CardTitle>
                    <CardDescription>
                      Approve matching times in one tap, then check paper for the rest.
                    </CardDescription>
                  </div>
                  {matchingHours.length > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => approveMatchingHours()}
                    >
                      Approve {matchingHours.length} matching
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {hoursToReview.length === 0 ? (
                  <EmptyState
                    compact
                    className="px-0 py-4"
                    title="No hours waiting"
                    description="Submitted hours will show up here."
                    action={
                      <Link href="/admin/hours">
                        <Button size="sm" variant="secondary">
                          Open hours
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {hoursToReview.slice(0, 6).map((entry) => {
                      const shift = shifts.find(
                        (item) => item.id === entry.shiftId,
                      );
                      if (!shift) return null;
                      const matches =
                        entry.startTime === shift.startTime &&
                        entry.endTime === shift.endTime;

                      return (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {getEmployeeName(entry.employeeId)}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {formatDayLabel(shift.date)} ·{" "}
                              {formatTimeRange(entry.startTime, entry.endTime)}
                              {matches ? " · matches schedule" : " · differs"}
                            </p>
                          </div>
                          <Link
                            href="/admin/hours"
                            className="shrink-0 text-xs text-zinc-400 hover:text-foreground"
                          >
                            Review
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <ProcessNote>
              Use this alongside your current no-show and payment process.
            </ProcessNote>
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
