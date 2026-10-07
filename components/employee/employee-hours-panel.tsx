"use client";

import { useState } from "react";
import { EmployeeHoursForm } from "@/components/employee/employee-hours-form";
import { PageHeader } from "@/components/layout/page-header";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { submitHours } from "@/lib/services/schedule";
import {
  formatHourCount,
  hoursBetween,
  hoursForSignup,
  isPastShift,
} from "@/lib/shift-utils";
import { formatTimeRange } from "@/lib/utils";
import type { Shift } from "@/types";

export function EmployeeHoursPanel() {
  const loading = useInitialLoading();
  const employeeId = useCurrentEmployeeId();
  const { shifts, signups, hours } = useSchedule();
  const [target, setTarget] = useState<Shift | null>(null);

  const past = signups
    .filter((signup) => signup.employeeId === employeeId)
    .map((signup) => {
      const shift = shifts.find((item) => item.id === signup.shiftId);
      if (!shift || !isPastShift(shift)) return null;
      return {
        shift,
        hours: hoursForSignup(hours, shift.id, employeeId) ?? null,
      };
    })
    .filter((item) => item !== null)
    .sort(
      (a, b) => new Date(b.shift.date).getTime() - new Date(a.shift.date).getTime(),
    );

  const due = past.filter((item) => !item.hours);
  const submitted = past.filter((item) => item.hours);

  return (
    <div>
      <PageHeader
        title="Hours"
        description="Enter the hours you worked after a shift ends."
      />

      <div className="grid gap-8">
        <section>
          <h3 className="mb-3 text-sm font-medium tracking-tight text-foreground">
            To enter
          </h3>
          <ShiftCardList
            loading={loading}
            empty={due.length === 0}
            emptyTitle="No hours waiting"
            emptyDescription="After a shift ends, it will show up here."
          >
            {due.map(({ shift }) => (
              <ShiftCard
                key={shift.id}
                date={shift.date}
                startTime={shift.startTime}
                endTime={shift.endTime}
                label={shift.label}
                badges={<Badge variant="warning">Hours due</Badge>}
                meta={`Scheduled ${formatHourCount(hoursBetween(shift.startTime, shift.endTime))}`}
                actions={
                  <>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        submitHours({
                          shiftId: shift.id,
                          startTime: shift.startTime,
                          endTime: shift.endTime,
                        })
                      }
                    >
                      Hours were as scheduled
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTarget(shift)}
                    >
                      Different hours
                    </Button>
                  </>
                }
              />
            ))}
          </ShiftCardList>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium tracking-tight text-foreground">
            Submitted
          </h3>
          <ShiftCardList
            loading={loading}
            empty={submitted.length === 0}
            emptyTitle="No hours submitted yet"
            emptyDescription="Hours you enter will show up here."
          >
            {submitted.map(({ shift, hours: entry }) => (
              <ShiftCard
                key={shift.id}
                date={shift.date}
                startTime={shift.startTime}
                endTime={shift.endTime}
                label={shift.label}
                badges={
                  entry ? (
                    <Badge variant="pending">Submitted</Badge>
                  ) : null
                }
                meta={
                  entry
                    ? `Worked ${formatTimeRange(entry.startTime, entry.endTime)} · ${formatHourCount(hoursBetween(entry.startTime, entry.endTime))}`
                    : undefined
                }
              />
            ))}
          </ShiftCardList>
        </section>
      </div>

      <EmployeeHoursForm shift={target} onClose={() => setTarget(null)} />
    </div>
  );
}
