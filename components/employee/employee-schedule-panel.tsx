"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { confirmShift, leaveShift } from "@/lib/services/schedule";
import { isUpcomingShift, sortShifts } from "@/lib/shift-utils";
import { getSignupStatusLabel } from "@/lib/utils";

export function EmployeeSchedulePanel() {
  const loading = useInitialLoading();
  const employeeId = useCurrentEmployeeId();
  const { shifts, signups } = useSchedule();

  const mine = signups
    .filter((signup) => signup.employeeId === employeeId)
    .map((signup) => {
      const shift = shifts.find((item) => item.id === signup.shiftId);
      if (!shift || !isUpcomingShift(shift)) return null;
      return { shift, signup };
    })
    .filter((item) => item !== null);

  const scheduled = sortShifts(mine.map((item) => item.shift)).map((shift) => {
    const row = mine.find((item) => item.shift.id === shift.id);
    return row!;
  });

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Your upcoming shifts. Confirm so your admin knows you are coming."
      />

      <ShiftCardList
        loading={loading}
        empty={scheduled.length === 0}
        emptyTitle="No shifts on your schedule"
        emptyDescription="Choose a shift first, then it will appear here."
      >
        {scheduled.map(({ shift, signup }) => (
          <ShiftCard
            key={shift.id}
            date={shift.date}
            startTime={shift.startTime}
            endTime={shift.endTime}
            label={shift.label}
            note={shift.note}
            badges={
              <Badge
                variant={signup.status === "CONFIRMED" ? "confirmed" : "pending"}
              >
                {getSignupStatusLabel(signup.status)}
              </Badge>
            }
            actions={
              <>
                {signup.status !== "CONFIRMED" ? (
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => confirmShift(shift.id)}
                  >
                    I&apos;m coming
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => leaveShift(shift.id)}
                >
                  Leave shift
                </Button>
              </>
            }
          />
        ))}
      </ShiftCardList>
    </div>
  );
}
