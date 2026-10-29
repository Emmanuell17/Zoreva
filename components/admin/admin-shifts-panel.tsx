"use client";

import { useMemo, useState } from "react";
import { CreateShiftForm } from "@/components/admin/create-shift-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useCompany } from "@/hooks/use-company";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { formatJoinCode } from "@/lib/company/join-code";
import { getEmployeeName } from "@/lib/services";
import {
  assignEmployee,
  copyPreviousWeek,
  createShifts,
  publishWeek,
  removeShift,
  unassignEmployee,
  updateShift,
  type CreateShiftInput,
} from "@/lib/services/schedule";
import { calendarDayKey, isPastShift } from "@/lib/shift-utils";
import {
  coverageForShift,
  coverageForShifts,
  formatShiftDay,
  formatWeekRange,
  nextWeekKey,
  peopleOnShift,
  previousWeekKey,
  shiftsInWeek,
  weekDayKeys,
  weekStartKey,
} from "@/lib/rota/week";
import { formatTimeRange } from "@/lib/utils";
import type { Shift } from "@/types";

type ConfirmAction =
  | { kind: "remove"; shift: Shift }
  | { kind: "copy" }
  | { kind: "publish" };

export function AdminShiftsPanel() {
  const loading = useInitialLoading();
  const company = useCompany();
  const { shifts, signups } = useSchedule();
  const [weekStart, setWeekStart] = useState(() => weekStartKey(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [assigning, setAssigning] = useState<Shift | null>(null);
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignWarning, setAssignWarning] = useState<{
    employeeId: string;
    name: string;
    reasons: string[];
  } | null>(null);

  const days = weekDayKeys(weekStart);
  const weekShifts = useMemo(
    () =>
      shiftsInWeek(shifts, weekStart).sort(
        (a, b) =>
          calendarDayKey(a.date).localeCompare(calendarDayKey(b.date)) ||
          a.startTime.localeCompare(b.startTime),
      ),
    [shifts, weekStart],
  );
  const coverage = coverageForShifts(weekShifts, signups);
  const draftCount = weekShifts.filter((shift) => shift.status === "draft").length;
  const joinCode = company?.joinCode ? formatJoinCode(company.joinCode) : "";
  const staff = (company?.employees ?? []).filter((employee) => employee.role !== "ADMIN");
  const thisWeek = weekStartKey(new Date());

  function openCreate(date?: string) {
    setEditingShift(null);
    setAssigning(null);
    setCreateDate(date);
    setCreateOpen(true);
  }

  async function runConfirm() {
    if (!confirming) return;
    if (confirming.kind === "remove") {
      const result = removeShift(confirming.shift.id);
      setNotice(result.ok ? "Shift removed." : result.reason);
    }
    if (confirming.kind === "copy") {
      const result = copyPreviousWeek(weekStart);
      setNotice(
        result.ok
          ? `Copied ${result.created} ${result.created === 1 ? "shift" : "shifts"} as a draft.`
          : result.reason,
      );
    }
    if (confirming.kind === "publish") {
      const result = await publishWeek(weekStart);
      setNotice(
        result.ok
          ? `Published ${result.published} ${result.published === 1 ? "shift" : "shifts"}. Your team can see them now.`
          : result.reason,
      );
    }
    setConfirming(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            {company?.companyName ?? "Weekly rota"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Plan the week, then publish it for your team.
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
        <Button size="sm" className="w-full sm:w-auto" onClick={() => openCreate(weekStart)}>
          Add shift
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(previousWeekKey(weekStart))}>
            Previous week
          </Button>
          <p className="min-w-28 text-center text-sm font-medium text-foreground">
            {formatWeekRange(weekStart)}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(nextWeekKey(weekStart))}>
            Next week
          </Button>
          {weekStart !== thisWeek ? (
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(thisWeek)}>
              This week
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="confirmed">{coverage.filled} filled</Badge>
          <Badge variant={coverage.open > 0 ? "warning" : "default"}>{coverage.open} open</Badge>
          <Badge variant={coverage.unassigned > 0 ? "pending" : "default"}>
            {coverage.unassigned} with nobody
          </Badge>
          <Badge variant={draftCount > 0 ? "pending" : "success"}>
            {draftCount > 0 ? `${draftCount} draft` : "Published"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setConfirming({ kind: "copy" })}>
            Copy last week
          </Button>
          <Button
            size="sm"
            disabled={draftCount === 0}
            onClick={() => setConfirming({ kind: "publish" })}
          >
            Publish week
          </Button>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-zinc-300"
        >
          {notice}
        </p>
      ) : null}

      {loading ? (
        <LoadingState variant="cards" rows={3} label="Loading the rota" />
      ) : (
        <>
          {weekShifts.length === 0 ? (
            <div className="mb-4 rounded-md border border-border bg-surface px-4 py-6">
              <p className="text-sm font-medium text-foreground">Nothing on this week yet</p>
              <p className="mt-1 text-sm text-zinc-400">
                Add a shift, or copy last week. Copies stay a draft until you publish them.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openCreate(weekStart)}>
                  Add shift
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirming({ kind: "copy" })}>
                  Copy last week
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">
            {days.map((day) => (
              <a
                key={day}
                href={`#rota-${day}`}
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-zinc-300"
              >
                {formatShiftDay(day).split(",")[0]}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {days.map((day) => {
              const items = weekShifts.filter((shift) => calendarDayKey(shift.date) === day);
              return (
                <section
                  key={day}
                  id={`rota-${day}`}
                  className="rounded-md border border-border bg-surface p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-medium text-zinc-300">{formatShiftDay(day)}</h3>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 hover:text-foreground"
                      onClick={() => openCreate(day)}
                    >
                      Add
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-zinc-600">No shifts</p>
                  ) : (
                    <div className="grid gap-2">
                      {items.map((shift) => {
                        const shiftCoverage = coverageForShift(shift, signups);
                        const names = peopleOnShift(shift, signups).map((id) => getEmployeeName(id));
                        const finished = isPastShift(shift);
                        return (
                          <article key={shift.id} className="rounded-md border border-border px-2.5 py-2">
                            <p className="text-sm font-medium text-foreground">
                              {shift.label ?? formatTimeRange(shift.startTime, shift.endTime)}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {formatTimeRange(shift.startTime, shift.endTime)}
                            </p>
                            {shift.positions?.length ? (
                              <p className="mt-1 text-xs text-zinc-500">{shift.positions.join(", ")}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge variant={shift.status === "draft" ? "pending" : "success"}>
                                {shift.status === "draft" ? "Draft" : "Published"}
                              </Badge>
                              <Badge variant={shiftCoverage.unassigned ? "warning" : "default"}>
                                {shiftCoverage.filled} of {shiftCoverage.headcount}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-zinc-400">
                              {names.length === 0 ? "Nobody yet" : names.join(", ")}
                            </p>
                            {finished ? null : (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setCreateOpen(false);
                                    setAssigning(null);
                                    setEditingShift(shift);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAssignError(null);
                                    setAssigning(shift);
                                  }}
                                >
                                  Assign
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirming({ kind: "remove", shift })}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <CreateShiftForm
        key={editingShift?.id ?? (createOpen ? `create-${createDate ?? "week"}` : "closed")}
        open={createOpen || Boolean(editingShift)}
        shift={editingShift}
        initialDate={createDate}
        onClose={() => {
          setCreateOpen(false);
          setEditingShift(null);
        }}
        onCreate={(inputs: CreateShiftInput[]) => {
          const created = createShifts(inputs);
          setNotice(
            created.length === 0
              ? "Those shifts are already on the rota."
              : `Saved ${created.length} draft ${created.length === 1 ? "shift" : "shifts"}. Publish the week when you are ready.`,
          );
        }}
        onUpdate={(shiftId, input) => updateShift(shiftId, input)}
      />

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="Assign people"
        description={
          assigning
            ? `${formatShiftDay(assigning.date)} · ${formatTimeRange(assigning.startTime, assigning.endTime)}`
            : undefined
        }
      >
        {assigning ? (
          <div className="grid gap-2">
            {staff.length === 0 ? (
              <p className="text-sm text-zinc-400">Add your team before assigning shifts.</p>
            ) : (
              staff.map((employee) => {
                const assigned = (assigning.assigneeIds ?? []).includes(employee.id);
                return (
                  <div key={employee.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{employee.name}</span>
                    <Button
                      size="sm"
                      variant={assigned ? "secondary" : "primary"}
                      onClick={() => {
                        void (async () => {
                        if (assigned) {
                          const removed = await unassignEmployee(assigning.id, employee.id);
                          if (!removed.ok) {
                            setAssignError(removed.reason);
                            return;
                          }
                          setAssignError(null);
                          setAssignWarning(null);
                          setAssigning((current) =>
                            current
                              ? {
                                  ...current,
                                  assigneeIds: (current.assigneeIds ?? []).filter((id) => id !== employee.id),
                                }
                              : current,
                          );
                          return;
                        }
                        const result = await assignEmployee(assigning.id, employee.id);
                        if (!result.ok) {
                          if (result.level === "warn") {
                            setAssignError(null);
                            setAssignWarning({
                              employeeId: employee.id,
                              name: employee.name,
                              reasons: result.warnings,
                            });
                            return;
                          }
                          setAssignWarning(null);
                          setAssignError(result.reason);
                          return;
                        }
                        setAssignError(null);
                        setAssignWarning(null);
                        setAssigning((current) =>
                          current
                            ? {
                                ...current,
                                assigneeIds: assigned
                                  ? (current.assigneeIds ?? []).filter((id) => id !== employee.id)
                                  : [...(current.assigneeIds ?? []), employee.id],
                              }
                            : current,
                        );
                        })();
                      }}
                    >
                      {assigned ? "Remove" : "Assign"}
                    </Button>
                  </div>
                );
              })
            )}
            {assignWarning ? (
              <div role="alert" className="rounded-md border border-amber-900/80 bg-amber-950/40 p-3">
                <p className="text-sm text-amber-100">
                  {assignWarning.name} was not assigned. Confirm only if you still want to override this:
                </p>
                <ul className="mt-2 list-disc pl-4 text-sm text-amber-100">
                  {assignWarning.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!assigning) return;
                      void (async () => {
                      const result = await assignEmployee(assigning.id, assignWarning.employeeId, {
                        acknowledgeWarnings: true,
                      });
                      if (!result.ok) {
                        setAssignError(result.reason);
                        setAssignWarning(null);
                        return;
                      }
                      const employeeId = assignWarning.employeeId;
                      setAssignWarning(null);
                      setAssignError(null);
                      setAssigning((current) =>
                        current
                          ? { ...current, assigneeIds: [...(current.assigneeIds ?? []), employeeId] }
                          : current,
                      );
                      })();
                    }}
                  >
                    Assign anyway
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAssignWarning(null)}>
                    Don&apos;t assign
                  </Button>
                </div>
              </div>
            ) : null}
            {assignError ? (
              <p role="alert" className="text-sm text-red-300">
                {assignError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={
          confirming?.kind === "publish"
            ? "Publish this week?"
            : confirming?.kind === "copy"
              ? "Copy last week?"
              : "Cancel this shift?"
        }
        description={
          confirming?.kind === "publish"
            ? "Your team will see these shifts and can choose open spots."
            : confirming?.kind === "copy"
              ? "New shifts are saved as a draft. People and hours are not copied."
              : "This takes the shift off the week. If someone has already chosen it, it stays."
        }
      >
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
            {confirming?.kind === "remove" ? "Keep it" : "Go back"}
          </Button>
          <Button
            size="sm"
            variant={confirming?.kind === "remove" ? "danger" : "primary"}
            onClick={runConfirm}
          >
            {confirming?.kind === "publish"
              ? "Publish"
              : confirming?.kind === "copy"
                ? "Copy week"
                : "Cancel shift"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
