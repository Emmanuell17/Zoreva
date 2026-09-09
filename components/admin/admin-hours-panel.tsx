"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ProcessNote } from "@/components/layout/process-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { useSchedule } from "@/hooks/use-schedule";
import { getEmployeeName } from "@/lib/services";
import { approveMatchingHours, reviewHours } from "@/lib/services/schedule";
import { formatHourCount, hoursBetween } from "@/lib/shift-utils";
import {
  formatDayLabel,
  formatTimeRange,
  getHoursStatusLabel,
} from "@/lib/utils";
import type { HoursStatus } from "@/types";

const hoursVariant: Record<HoursStatus, "pending" | "confirmed" | "warning"> = {
  SUBMITTED: "pending",
  APPROVED: "confirmed",
  CHECK_PAPER: "warning",
};

export function AdminHoursPanel() {
  const loading = useInitialLoading();
  const { shifts, hours } = useSchedule();

  const waiting = hours.filter((entry) => entry.status === "SUBMITTED");
  const matching = waiting.filter((entry) => {
    const shift = shifts.find((item) => item.id === entry.shiftId);
    return (
      shift &&
      entry.startTime === shift.startTime &&
      entry.endTime === shift.endTime
    );
  });
  const reviewed = hours.filter((entry) => entry.status !== "SUBMITTED");

  function HoursRow({
    entryId,
    actions,
  }: {
    entryId: string;
    actions?: React.ReactNode;
  }) {
    const entry = hours.find((item) => item.id === entryId);
    const shift = entry
      ? shifts.find((item) => item.id === entry.shiftId)
      : undefined;
    if (!entry || !shift) return null;

    const scheduled = formatTimeRange(shift.startTime, shift.endTime);
    const worked = formatTimeRange(entry.startTime, entry.endTime);
    const mismatch = scheduled !== worked;

    return (
      <li className="rounded-md border border-border bg-surface px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {getEmployeeName(entry.employeeId)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {formatDayLabel(shift.date)} · {shift.label ?? "Shift"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Scheduled {scheduled} · Entered {worked}
              {mismatch ? " · times differ" : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {formatHourCount(hoursBetween(entry.startTime, entry.endTime))}{" "}
              entered
            </p>
            {entry.note ? (
              <p className="mt-2 text-xs text-zinc-500">{entry.note}</p>
            ) : null}
          </div>
          <Badge variant={hoursVariant[entry.status]}>
            {getHoursStatusLabel(entry.status)}
          </Badge>
        </div>
        {actions ? <div className="mt-3 flex gap-2">{actions}</div> : null}
      </li>
    );
  }

  return (
    <div>
      <PageHeader
        title="Hours"
        description="Review digital hours against paper records, then continue payment as usual."
        actions={
          matching.length > 0 ? (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => approveMatchingHours()}
            >
              Approve {matching.length} matching
            </Button>
          ) : null
        }
      />

      <div className="mb-6">
        <ProcessNote>
          Approve when the app matches the paper form. Use Check paper if they
          differ. Payment still happens on your existing website.
        </ProcessNote>
      </div>

      <div className="grid gap-8">
        <section>
          <h3 className="mb-3 text-sm font-medium tracking-tight text-foreground">
            Waiting
          </h3>
          {loading ? (
            <LoadingState variant="cards" rows={3} label="Loading hours" />
          ) : waiting.length === 0 ? (
            <div className="rounded-md border border-border bg-surface">
              <EmptyState
                title="No hours waiting"
                description="When employees enter hours, they will show up here."
              />
            </div>
          ) : (
            <>
              <ul className="grid gap-3 md:hidden">
                {waiting.map((entry) => (
                  <HoursRow
                    key={entry.id}
                    entryId={entry.id}
                    actions={
                      <>
                        <Button
                          size="sm"
                          onClick={() => reviewHours(entry.id, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => reviewHours(entry.id, "CHECK_PAPER")}
                        >
                          Check paper
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Employee</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Entered</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waiting.map((entry) => {
                      const shift = shifts.find((item) => item.id === entry.shiftId);
                      if (!shift) return null;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium text-foreground">
                            {getEmployeeName(entry.employeeId)}
                          </TableCell>
                          <TableCell>{formatDayLabel(shift.date)}</TableCell>
                          <TableCell>
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </TableCell>
                          <TableCell>
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => reviewHours(entry.id, "APPROVED")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  reviewHours(entry.id, "CHECK_PAPER")
                                }
                              >
                                Check paper
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium tracking-tight text-foreground">
            Reviewed
          </h3>
          {loading ? (
            <LoadingState variant="cards" rows={2} label="Loading reviewed hours" />
          ) : reviewed.length === 0 ? (
            <div className="rounded-md border border-border bg-surface">
              <EmptyState
                title="Nothing reviewed yet"
                description="Approved hours and paper checks will show up here."
              />
            </div>
          ) : (
            <ul className="grid gap-3">
              {reviewed.map((entry) => (
                <HoursRow key={entry.id} entryId={entry.id} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
