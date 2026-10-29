"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useCompany } from "@/hooks/use-company";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { getEmployeeName } from "@/lib/services";
import { reviewTimeOff } from "@/lib/services/availability";
import { formatShiftDay } from "@/lib/rota/week";
import { formatTimeRange } from "@/lib/utils";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AdminAvailabilityPanel() {
  const loading = useInitialLoading();
  const company = useCompany();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const requests = [...(company?.timeOff ?? [])].sort((a, b) => {
    if (a.status === b.status) return b.createdAt.localeCompare(a.createdAt);
    if (a.status === "pending") return -1;
    if (b.status === "pending") return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const windows = company?.availability ?? [];

  async function decide(id: string, status: "approved" | "rejected") {
    setPendingId(id);
    setError(null);
    setNotice(null);
    const result = await reviewTimeOff(id, status);
    setPendingId(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setNotice(status === "approved" ? "Time off approved." : "Time off rejected.");
  }

  return (
    <div>
      <PageHeader
        title="Time off"
        description="Approve or reject requests. Approved time off blocks a shift assignment. A pending request warns you and waits for your confirmation. This is not a legal working-time check."
      />
      {notice ? (
        <p role="status" className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-zinc-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {loading ? (
        <LoadingState variant="cards" rows={2} label="Loading time off" />
      ) : (
        <div className="grid gap-8">
          <section className="grid gap-2">
            {requests.length === 0 ? (
              <div className="rounded-md border border-border bg-surface px-4 py-6">
                <p className="text-sm font-medium text-foreground">No time-off requests</p>
                <p className="mt-1 text-sm text-zinc-400">When someone asks for time off, it shows up here.</p>
              </div>
            ) : (
              requests.map((request) => (
                <article key={request.id} className="rounded-md border border-border bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{getEmployeeName(request.employeeId)}</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {formatShiftDay(request.startDate)}
                        {request.endDate !== request.startDate ? ` – ${formatShiftDay(request.endDate)}` : ""}
                        {request.startTime && request.endTime
                          ? ` · ${formatTimeRange(request.startTime, request.endTime)}`
                          : " · All day"}
                      </p>
                      {request.reason ? <p className="mt-1 text-xs text-zinc-500">{request.reason}</p> : null}
                    </div>
                    <Badge
                      variant={
                        request.status === "approved"
                          ? "success"
                          : request.status === "rejected"
                            ? "cancelled"
                            : "pending"
                      }
                    >
                      {request.status === "approved" ? "Approved" : request.status === "rejected" ? "Rejected" : "Waiting"}
                    </Badge>
                  </div>
                  {request.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        loading={pendingId === request.id}
                        disabled={pendingId !== null}
                        onClick={() => void decide(request.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pendingId !== null}
                        onClick={() => void decide(request.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </section>
          <section className="grid gap-2">
            <h3 className="text-sm font-medium text-foreground">Hours the team submitted</h3>
            {windows.length === 0 ? (
              <p className="text-sm text-zinc-500">Nobody has added hours they can work yet.</p>
            ) : (
              <ul className="grid gap-2">
                {windows.map((window) => (
                  <li key={window.id} className="rounded-md border border-border px-3 py-2 text-sm text-zinc-300">
                    {getEmployeeName(window.employeeId)} ·{" "}
                    {window.kind === "recurring"
                      ? `Every ${WEEKDAYS[window.weekday ?? 0]}`
                      : formatShiftDay(window.date ?? "")}{" "}
                    · {formatTimeRange(window.startTime, window.endTime)} ·{" "}
                    {window.available ? "Can work" : "Cannot work"}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
