"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getManagerShifts,
  getUserName,
  mockManagerShifts,
} from "@/lib/mock-data";
import {
  cn,
  formatDate,
  formatTimeRange,
  getShiftStatusLabel,
} from "@/lib/utils";
import type { Shift, ShiftStatus } from "@/types";

const statusVariant: Record<
  ShiftStatus,
  "pending" | "confirmed" | "cancelled"
> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

export function ManagerShiftsPanel() {
  const [shifts] = useState<Shift[]>(() =>
    mockManagerShifts.map((shift) => ({ ...shift })),
  );

  const sortedShifts = useMemo(() => getManagerShifts(shifts), [shifts]);
  const pendingCount = sortedShifts.filter(
    (shift) => shift.status === "PENDING",
  ).length;
  const cancelledCount = sortedShifts.filter(
    (shift) => shift.status === "CANCELLED",
  ).length;

  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Monitor assignments, statuses, and coverage across the team."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="pending">{pendingCount} pending</Badge>
            <Badge variant="cancelled">{cancelledCount} cancelled</Badge>
            <Badge variant="default">{sortedShifts.length} total</Badge>
          </div>
        }
      />

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
          {sortedShifts.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={6}
                className="py-10 text-center text-zinc-500"
              >
                No shifts scheduled yet.
              </TableCell>
            </TableRow>
          ) : (
            sortedShifts.map((shift) => {
              const isCancelled = shift.status === "CANCELLED";

              return (
                <TableRow
                  key={shift.id}
                  className={cn(
                    isCancelled && "bg-red-950/20 hover:bg-red-950/30",
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    {getUserName(shift.employeeId)}
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
                    {shift.covered ? (
                      <Badge variant="success">Covered</Badge>
                    ) : isCancelled ? (
                      <Badge variant="warning">Needs cover</Badge>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-zinc-400">
                    {shift.note ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
