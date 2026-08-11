"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CreateShiftForm } from "@/components/manager/create-shift-form";
import { PageHeader } from "@/components/layout/page-header";
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
import type { CreateShiftInput } from "@/components/manager/create-shift-form";
import {
  createShift,
  getEmployeeName,
  getManagerShifts,
  subscribeShifts,
} from "@/lib/services";
import {
  cn,
  formatDate,
  formatTimeRange,
  getShiftStatusLabel,
} from "@/lib/utils";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import type { Shift, ShiftStatus } from "@/types";

const statusVariant: Record<
  ShiftStatus,
  "pending" | "confirmed" | "cancelled"
> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

function useManagerShifts() {
  return useSyncExternalStore(
    subscribeShifts,
    getManagerShifts,
    getManagerShifts,
  );
}

function CoverageBadge({ shift }: { shift: Shift }) {
  if (shift.covered) return <Badge variant="success">Covered</Badge>;
  if (shift.status === "CANCELLED") {
    return <Badge variant="warning">Needs cover</Badge>;
  }
  return <span className="text-xs text-zinc-600">—</span>;
}

export function ManagerShiftsPanel() {
  const loading = useInitialLoading();
  const shifts = useManagerShifts();
  const [createOpen, setCreateOpen] = useState(false);

  const pendingCount = useMemo(
    () => shifts.filter((shift) => shift.status === "PENDING").length,
    [shifts],
  );
  const cancelledCount = useMemo(
    () => shifts.filter((shift) => shift.status === "CANCELLED").length,
    [shifts],
  );

  function handleCreate(input: CreateShiftInput) {
    createShift(input);
  }

  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Monitor assignments, statuses, and coverage across the team."
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <p className="text-xs text-zinc-500">
              {loading
                ? "Loading counts…"
                : `${pendingCount} pending · ${cancelledCount} cancelled · ${shifts.length} total`}
            </p>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              Create shift
            </Button>
          </div>
        }
      />

      {loading ? (
        <>
          <div className="md:hidden">
            <LoadingState variant="cards" rows={4} label="Loading shifts" />
          </div>
          <div className="hidden overflow-hidden rounded-md border border-border bg-surface md:block">
            <LoadingState
              variant="table"
              rows={5}
              columns={6}
              label="Loading shifts"
            />
          </div>
        </>
      ) : shifts.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title="No shifts scheduled yet"
            description="Create a shift to start building the week."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create shift
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {shifts.map((shift) => {
              const isCancelled = shift.status === "CANCELLED";

              return (
                <li
                  key={shift.id}
                  className={cn(
                    "rounded-md border border-border bg-surface px-4 py-3.5",
                    isCancelled && "bg-red-950/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-tight text-foreground">
                        {getEmployeeName(shift.employeeId)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {formatDate(shift.date)} ·{" "}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <Badge variant={statusVariant[shift.status]}>
                        {getShiftStatusLabel(shift.status)}
                      </Badge>
                      <CoverageBadge shift={shift} />
                    </div>
                  </div>
                  {shift.note ? (
                    <p className="mt-3 text-xs text-zinc-500">{shift.note}</p>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Covered</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => {
                  const isCancelled = shift.status === "CANCELLED";

                  return (
                    <TableRow
                      key={shift.id}
                      className={cn(
                        isCancelled && "bg-red-950/20 hover:bg-red-950/30",
                      )}
                    >
                      <TableCell className="font-medium text-foreground">
                        {getEmployeeName(shift.employeeId)}
                      </TableCell>
                      <TableCell>{formatDate(shift.date)}</TableCell>
                      <TableCell>
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[shift.status]}>
                          {getShiftStatusLabel(shift.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CoverageBadge shift={shift} />
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate text-zinc-400">
                        {shift.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <CreateShiftForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
