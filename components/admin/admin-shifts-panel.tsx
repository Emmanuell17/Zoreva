"use client";

import { useMemo, useState } from "react";
import { CreateShiftForm } from "@/components/admin/create-shift-form";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessNote } from "@/components/layout/process-note";
import { ShiftCard, SpotsBadge } from "@/components/shifts/shift-card";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { shiftRosterText } from "@/lib/copy-text";
import { groupByDay } from "@/lib/group-by-day";
import { getEmployeeName } from "@/lib/services";
import {
  createShifts,
  removeShift,
  type CreateShiftInput,
} from "@/lib/services/schedule";
import {
  isUpcomingShift,
  remainingSlots,
  signupsForShift,
} from "@/lib/shift-utils";

export function AdminShiftsPanel() {
  const loading = useInitialLoading();
  const { shifts, signups } = useSchedule();
  const [createOpen, setCreateOpen] = useState(false);

  const upcoming = useMemo(
    () => shifts.filter((shift) => isUpcomingShift(shift)),
    [shifts],
  );
  const grouped = groupByDay(upcoming);

  function handleCreate(inputs: CreateShiftInput[]) {
    createShifts(inputs);
  }

  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Create shifts, see who chose them, copy the list for Facebook."
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

      <div className="mb-4">
        <ProcessNote>
          If someone does not show up, continue your usual no-show process.
        </ProcessNote>
      </div>

      <ShiftCardList
        loading={loading}
        empty={upcoming.length === 0}
        emptyTitle="No upcoming shifts"
        emptyDescription="Create a shift so employees can choose it."
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create shifts
          </Button>
        }
      >
        {grouped.map((group) => (
          <div key={group.label} className="grid gap-2">
            <h3 className="text-xs font-medium tracking-wide text-zinc-500">
              {group.label}
            </h3>
            {group.items.map((shift) => {
              const people = signupsForShift(signups, shift.id);
              const remaining = remainingSlots(shift, signups);
              const unconfirmed = people.filter(
                (signup) => signup.status !== "CONFIRMED",
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
                    <>
                      <SpotsBadge remaining={remaining} slots={shift.slots} />
                      {unconfirmed.length > 0 ? (
                        <Badge variant="pending">
                          {unconfirmed.length} not confirmed
                        </Badge>
                      ) : people.length > 0 ? (
                        <Badge variant="confirmed">All confirmed</Badge>
                      ) : null}
                    </>
                  }
                  meta={
                    people.length === 0 ? (
                      "Nobody has chosen this yet"
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {people.map((signup) => (
                          <li
                            key={signup.id}
                            className="flex items-center gap-2"
                          >
                            <span>{getEmployeeName(signup.employeeId)}</span>
                            <Badge
                              variant={
                                signup.status === "CONFIRMED"
                                  ? "confirmed"
                                  : "pending"
                              }
                            >
                              {signup.status === "CONFIRMED"
                                ? "Confirmed"
                                : "Not confirmed"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )
                  }
                  actions={
                    <>
                      <CopyButton
                        text={shiftRosterText(shift, signups)}
                        label="Copy for Facebook"
                      />
                      {people.length === 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeShift(shift.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        ))}
      </ShiftCardList>

      <CreateShiftForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
