"use client";

import { useState, useSyncExternalStore } from "react";
import { ShiftSwapForm } from "@/components/employee/shift-swap-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getManagerShifts,
  getUserName,
  mockEmployeeShifts,
  mockManagerShifts,
} from "@/lib/mock-data";
import {
  addSwapRequest,
  getSwapRequests,
  subscribeSwapRequests,
  updateSwapRequestStatus,
} from "@/lib/swap-store";
import { formatDate, formatTimeRange } from "@/lib/utils";
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
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
  }
}

function findShift(shiftId: string, shifts: Shift[]): Shift | undefined {
  return shifts.find((shift) => shift.id === shiftId);
}

function useSwapRequests() {
  return useSyncExternalStore(
    subscribeSwapRequests,
    getSwapRequests,
    getSwapRequests,
  );
}

export function ShiftSwapPanel() {
  const requests = useSwapRequests();
  const [swapShift, setSwapShift] = useState<Shift | null>(null);
  const allShifts = getManagerShifts([
    ...mockManagerShifts,
    ...mockEmployeeShifts,
  ]);
  const myShifts = mockEmployeeShifts.filter(
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
            disabled={myShifts.length === 0}
            onClick={() => setSwapShift(myShifts[0] ?? null)}
          >
            New swap request
          </Button>
        }
      />

      <div className="grid gap-6">
        <section className="rounded-md border border-zinc-800">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Your requests</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Frontend-only workflow — statuses update in this session.
            </p>
          </div>

          {requests.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No swap requests yet.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {requests.map((request) => {
                const fromShift = findShift(request.fromShiftId, allShifts);
                const toShift = request.toShiftId
                  ? findShift(request.toShiftId, allShifts)
                  : undefined;

                return (
                  <li key={request.id} className="px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Swap with {getUserName(request.toEmployeeId)}
                          </p>
                          <Badge variant={statusVariant[request.status]}>
                            {statusLabel(request.status)}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                          <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                            <p className="text-zinc-500">You give</p>
                            <p className="mt-1 text-foreground">
                              {fromShift
                                ? `${formatDate(fromShift.date)} · ${formatTimeRange(fromShift.startTime, fromShift.endTime)}`
                                : "Shift unavailable"}
                            </p>
                          </div>
                          <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
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
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              updateSwapRequestStatus(request.id, "ACCEPTED")
                            }
                          >
                            Mark accepted
                          </Button>
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
