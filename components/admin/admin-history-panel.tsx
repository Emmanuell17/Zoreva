"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { getEmployeeName } from "@/lib/services";
import {
  hoursForSignup,
  isPastShift,
  signupsForShift,
  sortShifts,
} from "@/lib/shift-utils";
import { formatTimeRange, getHoursStatusLabel } from "@/lib/utils";

export function AdminHistoryPanel() {
  const loading = useInitialLoading();
  const { shifts, signups, hours } = useSchedule();
  const past = sortShifts(shifts.filter((shift) => isPastShift(shift))).reverse();

  return (
    <div>
      <PageHeader
        title="History"
        description="Past shifts, who worked, and the hours they entered."
      />

      <ShiftCardList
        loading={loading}
        empty={past.length === 0}
        emptyTitle="No past shifts yet"
        emptyDescription="Finished shifts will collect here."
      >
        {past.map((shift) => {
          const people = signupsForShift(signups, shift.id);

          return (
            <ShiftCard
              key={shift.id}
              date={shift.date}
              startTime={shift.startTime}
              endTime={shift.endTime}
              label={shift.label}
              badges={
                <Badge variant="default">
                  {people.length} {people.length === 1 ? "person" : "people"}
                </Badge>
              }
              meta={
                people.length === 0 ? (
                  "Nobody was on this shift"
                ) : (
                  <ul className="mt-1 space-y-1">
                    {people.map((signup) => {
                      const entry = hoursForSignup(
                        hours,
                        shift.id,
                        signup.employeeId,
                      );

                      return (
                        <li key={signup.id}>
                          {getEmployeeName(signup.employeeId)}
                          {entry
                            ? ` · ${formatTimeRange(entry.startTime, entry.endTime)} · ${getHoursStatusLabel(entry.status)}`
                            : " · no hours entered"}
                        </li>
                      );
                    })}
                  </ul>
                )
              }
            />
          );
        })}
      </ShiftCardList>
    </div>
  );
}
