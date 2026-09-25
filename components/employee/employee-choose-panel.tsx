"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ShiftCard, SpotsBadge } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { groupByDay } from "@/lib/group-by-day";
import { confirmShift, selectShift } from "@/lib/services/schedule";
import {
  employeeHasOverlap,
  isUpcomingShift,
  remainingSlots,
} from "@/lib/shift-utils";

export function EmployeeChoosePanel() {
  const loading = useInitialLoading();
  const employeeId = useCurrentEmployeeId();
  const { shifts, signups } = useSchedule();
  const [error, setError] = useState<string | null>(null);

  const openShifts = shifts.filter((shift) => isUpcomingShift(shift));
  const grouped = groupByDay(openShifts);

  function handleChoose(shiftId: string) {
    const result = selectShift(shiftId);
    if (result.ok) {
      setError(null);
      return;
    }
    setError(result.reason);
  }

  return (
    <div>
      <PageHeader
        title="Choose"
        description="Tap a shift you can work. Then confirm you are coming."
      />

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <ShiftCardList
        loading={loading}
        empty={openShifts.length === 0}
        emptyTitle="No open shifts right now"
        emptyDescription="When an admin adds a shift, it will show up here."
      >
        {grouped.map((group) => (
          <div key={group.label} className="grid gap-2">
            <h3 className="text-xs font-medium tracking-wide text-zinc-500">
              {group.label}
            </h3>
            {group.items.map((shift) => {
              const remaining = remainingSlots(shift, signups);
              const mine = signups.find(
                (signup) =>
                  signup.shiftId === shift.id &&
                  signup.employeeId === employeeId,
              );
              const overlap = employeeHasOverlap(
                employeeId,
                shift,
                shifts,
                signups,
              );

              return (
                <ShiftCard
                  key={shift.id}
                  date={shift.date}
                  startTime={shift.startTime}
                  endTime={shift.endTime}
                  label={shift.label}
                  note={shift.note}
                  badges={
                    mine ? (
                      <Badge
                        variant={
                          mine.status === "CONFIRMED" ? "confirmed" : "pending"
                        }
                      >
                        {mine.status === "CONFIRMED"
                          ? "You're coming"
                          : "You chose this"}
                      </Badge>
                    ) : (
                      <SpotsBadge remaining={remaining} slots={shift.slots} />
                    )
                  }
                  actions={
                    mine ? (
                      mine.status !== "CONFIRMED" ? (
                        <Button
                          size="lg"
                          className="w-full sm:w-auto"
                          onClick={() => confirmShift(shift.id)}
                        >
                          I&apos;m coming
                        </Button>
                      ) : null
                    ) : remaining <= 0 ? (
                      <Button size="sm" disabled>
                        Full
                      </Button>
                    ) : overlap ? (
                      <Button size="sm" disabled>
                        Overlaps your other shift
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full sm:w-auto"
                        onClick={() => handleChoose(shift.id)}
                      >
                        Choose this shift
                      </Button>
                    )
                  }
                />
              );
            })}
          </div>
        ))}
      </ShiftCardList>
    </div>
  );
}
