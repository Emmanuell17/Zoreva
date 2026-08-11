"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import {
  getEmployeeName,
  getShiftById,
  getSwapRequests,
  subscribeSwapRequests,
  updateSwapRequestStatus,
} from "@/lib/services";
import { formatDate, formatTimeRange } from "@/lib/utils";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import type { ShiftSwapRequest, SwapRequestStatus } from "@/types";

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

export function ManagerSwapApprovalPanel() {
  const loading = useInitialLoading();
  const requests = useSwapRequests();
  const [rejectTarget, setRejectTarget] = useState<ShiftSwapRequest | null>(
    null,
  );
  const [rejectNote, setRejectNote] = useState("");

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING"),
    [requests],
  );
  const reviewedRequests = useMemo(
    () => requests.filter((request) => request.status !== "PENDING"),
    [requests],
  );

  function approveRequest(id: string) {
    updateSwapRequestStatus(id, "ACCEPTED");
  }

  function openReject(request: ShiftSwapRequest) {
    setRejectTarget(request);
    setRejectNote("");
  }

  function closeReject() {
    setRejectTarget(null);
    setRejectNote("");
  }

  function submitReject() {
    if (!rejectTarget) return;
    updateSwapRequestStatus(rejectTarget.id, "DECLINED");
    closeReject();
  }

  function renderRequest(request: ShiftSwapRequest) {
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
                {getEmployeeName(request.fromEmployeeId)} →{" "}
                {getEmployeeName(request.toEmployeeId)}
              </p>
              <Badge variant={statusVariant[request.status]}>
                {statusLabel(request.status)}
              </Badge>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-zinc-950/70 px-3 py-2.5">
                <p className="text-zinc-500">Offered shift</p>
                <p className="mt-1 text-foreground">
                  {fromShift
                    ? `${formatDate(fromShift.date)} · ${formatTimeRange(fromShift.startTime, fromShift.endTime)}`
                    : "Shift unavailable"}
                </p>
                <p className="mt-1 text-zinc-500">
                  {getEmployeeName(request.fromEmployeeId)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-zinc-950/70 px-3 py-2.5">
                <p className="text-zinc-500">Requested in return</p>
                <p className="mt-1 text-foreground">
                  {toShift
                    ? `${formatDate(toShift.date)} · ${formatTimeRange(toShift.startTime, toShift.endTime)}`
                    : "Open request"}
                </p>
                <p className="mt-1 text-zinc-500">
                  {getEmployeeName(request.toEmployeeId)}
                </p>
              </div>
            </div>

            {request.message ? (
              <p className="mt-3 text-xs text-zinc-500">"{request.message}"</p>
            ) : null}
          </div>

          {request.status === "PENDING" ? (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => approveRequest(request.id)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="w-full sm:w-auto"
                onClick={() => openReject(request)}
              >
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <div>
      <PageHeader
        title="Swap approvals"
        description="Review employee swap requests and approve or reject them."
        actions={
          <p className="text-xs text-zinc-500">
            {loading
              ? "Loading…"
              : `${pendingRequests.length} awaiting review`}
          </p>
        }
      />

      <div className="grid gap-6">
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3.5">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Awaiting review
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Approve to confirm the trade, or reject with an optional note.
            </p>
          </div>
          {loading ? (
            <LoadingState
              variant="list"
              rows={3}
              label="Loading pending swaps"
            />
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              title="No swap requests waiting for approval"
              description="New employee swap requests will appear here for review."
            />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {pendingRequests.map(renderRequest)}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3.5">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Reviewed requests
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Approved, rejected, and withdrawn swaps.
            </p>
          </div>
          {loading ? (
            <LoadingState
              variant="list"
              rows={2}
              label="Loading reviewed swaps"
            />
          ) : reviewedRequests.length === 0 ? (
            <EmptyState
              title="No reviewed requests yet"
              description="Approved, rejected, and withdrawn swaps will show up here."
            />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {reviewedRequests.map(renderRequest)}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={rejectTarget !== null}
        onClose={closeReject}
        title="Reject swap request"
        description="Optionally explain why this swap cannot go ahead."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Note (optional)"
            name="rejectNote"
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            placeholder="e.g. Coverage is already tight that day"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeReject}>
              Keep pending
            </Button>
            <Button variant="danger" size="sm" onClick={submitReject}>
              Reject request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
