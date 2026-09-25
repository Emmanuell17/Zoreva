"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessNote } from "@/components/layout/process-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useCompany } from "@/hooks/use-company";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { confirmShift, submitHours } from "@/lib/services/schedule";
import {
  hoursForSignup,
  isPastShift,
  isUpcomingShift,
} from "@/lib/shift-utils";
import {
  formatDayLabel,
  formatTimeRange,
  getSignupStatusLabel,
} from "@/lib/utils";

export function EmployeeDashboard() {
  const loading = useInitialLoading();
  const company = useCompany();
  const employeeId = useCurrentEmployeeId();
  const { shifts, signups, hours } = useSchedule();

  const mine = signups.filter((signup) => signup.employeeId === employeeId);
  const myUpcoming = mine
    .map((signup) => {
      const shift = shifts.find((item) => item.id === signup.shiftId);
      if (!shift || !isUpcomingShift(shift)) return null;
      return { shift, signup };
    })
    .filter((item) => item !== null)
    .sort(
      (a, b) =>
        new Date(a.shift.date).getTime() - new Date(b.shift.date).getTime() ||
        a.shift.startTime.localeCompare(b.shift.startTime),
    );

  const hoursDue = mine
    .map((signup) => {
      const shift = shifts.find((item) => item.id === signup.shiftId);
      if (!shift || !isPastShift(shift)) return null;
      if (hoursForSignup(hours, shift.id, employeeId)) return null;
      return { shift, signup };
    })
    .filter((item) => item !== null);

  const confirmNow = myUpcoming.find((item) => item.signup.status !== "CONFIRMED");
  const hoursNow = hoursDue[0];
  const nextShift = myUpcoming[0];

  return (
    <div>
      <PageHeader
        title="Home"
        description={
          company?.companyName
            ? `${company.companyName} — one thing at a time.`
            : "One thing at a time."
        }
      />

      <div className="grid gap-5">
        {loading ? (
          <LoadingState variant="cards" rows={2} label="Loading your next step" />
        ) : hoursNow ? (
          <Card>
            <CardHeader>
              <CardTitle>Enter hours</CardTitle>
              <CardDescription>
                {formatDayLabel(hoursNow.shift.date)} ·{" "}
                {formatTimeRange(
                  hoursNow.shift.startTime,
                  hoursNow.shift.endTime,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full"
                onClick={() =>
                  submitHours({
                    shiftId: hoursNow.shift.id,
                    startTime: hoursNow.shift.startTime,
                    endTime: hoursNow.shift.endTime,
                  })
                }
              >
                Hours were as scheduled
              </Button>
              <Link href="/employee/hours" className="w-full">
                <Button variant="ghost" className="w-full">
                  Enter different hours
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : confirmNow ? (
          <Card>
            <CardHeader>
              <CardTitle>Are you coming?</CardTitle>
              <CardDescription>
                {formatDayLabel(confirmNow.shift.date)} ·{" "}
                {confirmNow.shift.label ?? "Shift"} ·{" "}
                {formatTimeRange(
                  confirmNow.shift.startTime,
                  confirmNow.shift.endTime,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full"
                onClick={() => confirmShift(confirmNow.shift.id)}
              >
                I&apos;m coming
              </Button>
            </CardContent>
          </Card>
        ) : nextShift ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>You&apos;re on the schedule</CardTitle>
                  <CardDescription>
                    {formatDayLabel(nextShift.shift.date)} ·{" "}
                    {nextShift.shift.label ?? "Shift"} ·{" "}
                    {formatTimeRange(
                      nextShift.shift.startTime,
                      nextShift.shift.endTime,
                    )}
                  </CardDescription>
                </div>
                <Badge variant="confirmed">
                  {getSignupStatusLabel(nextShift.signup.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/employee/schedule" className="block w-full">
                <Button variant="secondary" className="w-full">
                  See my shifts
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Choose a shift</CardTitle>
              <CardDescription>Pick a day you can work.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/employee/choose" className="block w-full">
                <Button size="lg" className="w-full">
                  Choose a shift
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/employee/choose">
            <Button variant="secondary" className="h-12 w-full">
              Choose
            </Button>
          </Link>
          <Link href="/employee/hours">
            <Button variant="secondary" className="h-12 w-full">
              {hoursDue.length > 0 ? `Hours (${hoursDue.length})` : "Hours"}
            </Button>
          </Link>
        </div>

        <ProcessNote>
          Keep using Facebook, the paper form, and the payment website as usual.
        </ProcessNote>
      </div>
    </div>
  );
}
