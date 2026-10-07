"use client";

import { useMemo, useState } from "react";
import { CreateShiftForm } from "@/components/admin/create-shift-form";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useCompany } from "@/hooks/use-company";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { formatJoinCode } from "@/lib/company/join-code";
import { groupByDay } from "@/lib/group-by-day";
import { getEmployeeName } from "@/lib/services";
import {
  createShifts,
  removeShift,
  updateShift,
  type CreateShiftInput,
} from "@/lib/services/schedule";
import {
  isUpcomingShift,
  remainingSlots,
  signupsForShift,
} from "@/lib/shift-utils";
import { formatTimeRange } from "@/lib/utils";
import type { Shift } from "@/types";

export function AdminShiftsPanel() {
  const loading = useInitialLoading();
  const company = useCompany();
  const { shifts, signups } = useSchedule();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const upcoming = useMemo(
    () => shifts.filter((shift) => isUpcomingShift(shift)),
    [shifts],
  );
  const grouped = groupByDay(upcoming);
  const joinCode = company?.joinCode ? formatJoinCode(company.joinCode) : "";

  function openCreate() {
    setEditingShift(null);
    setCreateOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            {company?.companyName ?? "Shifts"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Who is working, and when.
          </p>
          {joinCode ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              Team code{" "}
              <span className="font-mono tracking-[0.14em] text-foreground">
                {joinCode}
              </span>
              <CopyButton text={joinCode} label="Copy" variant="ghost" />
            </p>
          ) : null}
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={openCreate}>
          Create shifts
        </Button>
      </div>

      <ShiftCardList
        loading={loading}
        empty={upcoming.length === 0}
        emptyTitle="No shifts this week"
        emptyDescription="Create shifts, then people can choose them."
        emptyAction={
          <Button size="sm" onClick={openCreate}>
            Create shifts
          </Button>
        }
      >
        {grouped.map((group) => (
          <section key={group.label} className="grid gap-2">
            <h3 className="text-xs font-medium tracking-wide text-zinc-500">
              {group.label}
            </h3>
            {group.items.map((shift) => {
              const people = signupsForShift(signups, shift.id);
              const remaining = remainingSlots(shift, signups);

              return (
                <article
                  key={shift.id}
                  className="rounded-md border border-border bg-surface px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {shift.label ?? "Shift"} ·{" "}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                      {people.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">Nobody yet</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {people.map((signup) => (
                            <li
                              key={signup.id}
                              className="flex items-center gap-2 text-xs text-zinc-300"
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
                      )}
                    </div>
                    <Badge variant={remaining <= 0 ? "cancelled" : "default"}>
                      {remaining <= 0
                        ? "Full"
                        : `${remaining} ${remaining === 1 ? "spot" : "spots"} left`}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCreateOpen(false);
                        setEditingShift(shift);
                      }}
                    >
                      Edit
                    </Button>
                    {people.length === 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeShift(shift.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </ShiftCardList>

      <CreateShiftForm
        open={createOpen || Boolean(editingShift)}
        shift={editingShift}
        onClose={() => {
          setCreateOpen(false);
          setEditingShift(null);
        }}
        onCreate={(inputs: CreateShiftInput[]) => createShifts(inputs)}
        onUpdate={(shiftId, input) => updateShift(shiftId, input)}
      />
    </div>
  );
}
