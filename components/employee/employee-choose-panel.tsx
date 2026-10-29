"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ShiftActionNotice } from "@/components/employee/shift-action-notice";
import { ShiftCard, SpotsBadge } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { assignmentConflicts } from "@/lib/availability/conflicts";
import { useShiftCommand } from "@/hooks/use-shift-command";
import { groupByDay } from "@/lib/group-by-day";
import { coverageForShift, isPublishedShift } from "@/lib/rota/week";
import { confirmShift, selectShift } from "@/lib/services/schedule";
import { employeeHasOverlap, isUpcomingShift } from "@/lib/shift-utils";

export function EmployeeChoosePanel() {
  const loading = useInitialLoading();
  const employeeId = useCurrentEmployeeId();
  const company = useCompany();
  const { shifts, signups } = useSchedule();
  const { pending, error, success, canRetry, run, retry } = useShiftCommand();

  const openShifts = shifts.filter(
    (shift) => isPublishedShift(shift) && isUpcomingShift(shift),
  );
  const grouped = groupByDay(openShifts);

  function handleChoose(shiftId: string) {
    void run(`book:${shiftId}`, async () => {
      const result = await selectShift(shiftId);
      if (!result.ok) return result;
      return {
        ok: true,
        message: result.alreadyBooked
          ? "You're already on this shift."
          : "Your shift is saved.",
      };
    });
  }

  function handleConfirm(shiftId: string) {
    void run(`confirm:${shiftId}`, async () => {
      const result = await confirmShift(shiftId);
      if (!result.ok) return result;
      return { ok: true, message: "You're confirmed for this shift." };
    });
  }

  return (
    <div>
      <PageHeader
        title="Choose"
        description="Tap a shift you can work. Then confirm you are coming."
      />

      <ShiftActionNotice
        error={error}
        success={success}
        onRetry={canRetry ? retry : null}
      />

      <ShiftCardList
        loading={loading}
        empty={openShifts.length === 0}
        emptyTitle="No open shifts right now"
        emptyDescription="When your manager publishes a shift, it will show up here."
      >
        {grouped.map((group) => (
          <div key={group.label} className="grid gap-2">
            <h3 className="text-xs font-medium tracking-wide text-zinc-500">
              {group.label}
            </h3>
            {group.items.map((shift) => {
              const remaining = coverageForShift(shift, signups).open;
              const planned = (shift.assigneeIds ?? []).includes(employeeId);
              const conflicts = assignmentConflicts({
                employeeId,
                shift,
                shifts,
                signups,
                availability: company?.availability,
                timeOff: company?.timeOff,
                rules: company?.availabilityRules,
              });
              const blocked = conflicts.blockers.find((item) => item.code !== "overlap");
              const caution = conflicts.warnings[0];
              const asYou = (reason: string) =>
                reason
                  .replace("This person has", "You have")
                  .replace("This person asked", "You asked")
                  .replace("This person said", "You said")
                  .replace("This person did not", "You did not");
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
                    mine || planned ? (
                      <Badge
                        variant={
                          mine?.status === "CONFIRMED" ? "confirmed" : "pending"
                        }
                      >
                        {mine?.status === "CONFIRMED"
                          ? "You're coming"
                          : mine
                            ? "You chose this"
                            : "You're scheduled"}
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
                          loading={pending === `confirm:${shift.id}`}
                          disabled={pending !== null}
                          onClick={() => handleConfirm(shift.id)}
                        >
                          I&apos;m coming
                        </Button>
                      ) : null
                    ) : planned ? (
                      <Button size="sm" disabled>
                        Already planned
                      </Button>
                    ) : blocked ? (
                      <p className="text-xs text-amber-200">{asYou(blocked.reason)}</p>
                    ) : remaining <= 0 ? (
                      <Button size="sm" disabled>
                        Full
                      </Button>
                    ) : overlap ? (
                      <Button size="sm" disabled>
                        Overlaps your other shift
                      </Button>
                    ) : (
                      <div className="grid gap-2">
                        {caution ? (
                          <p className="text-xs text-amber-200">{asYou(caution.reason)}</p>
                        ) : null}
                        <Button
                          size="lg"
                          className="w-full sm:w-auto"
                          loading={pending === `book:${shift.id}`}
                          disabled={pending !== null}
                          onClick={() => handleChoose(shift.id)}
                        >
                          Choose this shift
                        </Button>
                      </div>
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
