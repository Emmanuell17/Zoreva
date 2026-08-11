"use client";

import { useState, useSyncExternalStore } from "react";
import { ShiftSwapForm } from "@/components/employee/shift-swap-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  addSwapRequest,
  getEmployeeName,
  getEmployeeShifts,
  getShiftById,
  getSwapRequests,
  subscribeSwapRequests,
  updateSwapRequestStatus,
} from "@/lib/services";
import { formatDate, formatTimeRange } from "@/lib/utils";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import type { Shift, ShiftSwapRequest, SwapRequestStatus } from "@/types";

const statusVariant: Record<
  SwapRequestStatus,
  "pending" | "confirmed" | "cancelled" | "warning"
> = {
  PENDING: "pending",
  ACCEPTED: "confirmed",
  DECLINED: "cancelled",
  CANCELLED: "warning",
};

function statusLabel(status: SwapRequestStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "ACCEPTED":
      return "Approved";
    case "DECLINED":
      return "Rejected";
    case "CANCELLED":
      return "Withdrawn";
  }
}

function useSwapRequests() {
  return useSyncExternalStore(
    subscribeSwapRequests,
    getSwapRequests,
    getSwapRequests,
  );
}

export function ShiftSwapPanel() {
  const loading = useInitialLoading();
  const requests = useSwapRequests();
  const [swapShift, setSwapShift] = useState<Shift | null>(null);
  const myShifts = getEmployeeShifts().filter(
    (shift) => shift.status === "PENDING" || shift.status === "CONFIRMED",
  );

  function handleCreate(request: ShiftSwapRequest) {
    addSwapRequest(request);
  }

  return (
    <div>
      <PageHeader
        title="Shift swaps"
        description="Request a trade with a teammate and track the status of each ask."
        actions={
          <Button
            size="sm"
            className="w-full sm:w-auto"
            disabled={loading || myShifts.length === 0}
            onClick={() => setSwapShift(myShifts[0] ?? null)}
          >
            New swap request
          </Button>
        }
      />

      <div className="grid gap-6">
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3.5">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Your requests
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Frontend-only workflow — statuses update in this session.
            </p>
          </div>

          {loading ? (
            <LoadingState variant="list" rows={3} label="Loading swap requests" />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No swap requests yet"
              description="Request a trade with a teammate when you need coverage."
              action={
                myShifts.length > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => setSwapShift(myShifts[0] ?? null)}
                  >
                    New swap request
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {requests.map((request) => {
                const fromShift = getShiftById(request.fromShiftId);
                const toShift = request.toShiftId
                  ? getShiftById(request.toShiftId)
                  : undefined;

                return (
                  <li key={request.id} className="px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Swap with {getEmployeeName(request.toEmployeeId)}
                          </p>
                          <Badge variant={statusVariant[request.status]}>
                            {statusLabel(request.status)}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                          <div className="rounded-md border border-border bg-zinc-950/70 px-3 py-2.5">
                            <p className="text-zinc-500">You give</p>
                            <p className="mt-1 text-foreground">
                              {fromShift
                                ? `${formatDate(fromShift.date)} · ${formatTimeRange(fromShift.startTime, fromShift.endTime)}`
                                : "Shift unavailable"}
                            </p>
                          </div>
                          <div className="rounded-md border border-border bg-zinc-950/70 px-3 py-2.5">
                            <p className="text-zinc-500">You want</p>
                            <p className="mt-1 text-foreground">
                              {toShift
                                ? `${formatDate(toShift.date)} · ${formatTimeRange(toShift.startTime, toShift.endTime)}`
                                : "Open request"}
                            </p>
                          </div>
                        </div>

                        {request.message ? (
                          <p className="mt-3 text-xs text-zinc-500">
                            "{request.message}"
                          </p>
                        ) : null}
                      </div>

                      {request.status === "PENDING" ? (
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-xs text-zinc-500">
                            Waiting for manager approval
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateSwapRequestStatus(request.id, "CANCELLED")
                            }
                          >
                            Withdraw
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ShiftSwapForm
        open={swapShift !== null}
        shift={swapShift}
        onClose={() => setSwapShift(null)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
