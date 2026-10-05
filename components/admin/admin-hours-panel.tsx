"use client";

import { PageHeader } from "@/components/layout/page-header";
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
import { formatHourCount, hoursBetween } from "@/lib/shift-utils";
import { formatDayLabel, formatTimeRange } from "@/lib/utils";

export function AdminHoursPanel() {
  const loading = useInitialLoading();
  const { shifts, hours } = useSchedule();

  const entries = [...hours].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  return (
    <div>
      <PageHeader
        title="Hours"
        description="Hours employees entered after their shifts."
      />

      {loading ? (
        <LoadingState variant="cards" rows={3} label="Loading hours" />
      ) : entries.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title="No hours yet"
            description="When employees enter hours, they will show up here."
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {entries.map((entry) => {
              const shift = shifts.find((item) => item.id === entry.shiftId);
              if (!shift) return null;
              const scheduled = formatTimeRange(shift.startTime, shift.endTime);
              const worked = formatTimeRange(entry.startTime, entry.endTime);

              return (
                <li
                  key={entry.id}
                  className="rounded-md border border-border bg-surface px-4 py-3.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {getEmployeeName(entry.employeeId)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatDayLabel(shift.date)} · {shift.label ?? "Shift"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Scheduled {scheduled} · Entered {worked}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {formatHourCount(hoursBetween(entry.startTime, entry.endTime))}{" "}
                    entered
                  </p>
                  {entry.note ? (
                    <p className="mt-2 text-xs text-zinc-500">{entry.note}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Entered</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const shift = shifts.find((item) => item.id === entry.shiftId);
                  if (!shift) return null;

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-foreground">
                        {getEmployeeName(entry.employeeId)}
                        {entry.note ? (
                          <p className="mt-1 text-xs font-normal text-zinc-500">
                            {entry.note}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDayLabel(shift.date)}</TableCell>
                      <TableCell>
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </TableCell>
                      <TableCell>
                        {formatTimeRange(entry.startTime, entry.endTime)}
                      </TableCell>
                      <TableCell>
                        {formatHourCount(
                          hoursBetween(entry.startTime, entry.endTime),
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
