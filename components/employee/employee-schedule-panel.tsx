"use client";

import { ShiftActionNotice } from "@/components/employee/shift-action-notice";
import { PageHeader } from "@/components/layout/page-header";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { useShiftCommand } from "@/hooks/use-shift-command";
import { confirmShift, leaveShift } from "@/lib/services/schedule";
import { isUpcomingShift, sortShifts } from "@/lib/shift-utils";
import { getSignupStatusLabel } from "@/lib/utils";

export function EmployeeSchedulePanel() {
  const loading = useInitialLoading();
  const employeeId = useCurrentEmployeeId();
  const { shifts, signups } = useSchedule();
  const { pending, error, success, canRetry, run, retry } = useShiftCommand();

  function handleConfirm(shiftId: string) {
    void run(`confirm:${shiftId}`, async () => {
      const result = await confirmShift(shiftId);
      if (!result.ok) return result;
      return { ok: true, message: "You're confirmed for this shift." };
    });
  }

  function handleLeave(shiftId: string) {
    void run(`leave:${shiftId}`, async () => {
      const result = await leaveShift(shiftId);
      if (!result.ok) return result;
      return { ok: true, message: "You left that shift." };
    });
  }

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

      <ShiftActionNotice
        error={error}
        success={success}
        onRetry={canRetry ? retry : null}
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
                    loading={pending === `confirm:${shift.id}`}
                    disabled={pending !== null}
                    onClick={() => handleConfirm(shift.id)}
                  >
                    I&apos;m coming
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  loading={pending === `leave:${shift.id}`}
                  disabled={pending !== null}
                  onClick={() => handleLeave(shift.id)}
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
