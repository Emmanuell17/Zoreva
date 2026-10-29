"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useCompany } from "@/hooks/use-company";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import {
  cancelTimeOff,
  removeAvailabilityWindow,
  requestTimeOff,
  saveAvailabilityWindow,
} from "@/lib/services/availability";
import { formatShiftDay } from "@/lib/rota/week";
import { formatTimeRange } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function EmployeeAvailabilityPanel() {
  const loading = useInitialLoading();
  const company = useCompany();
  const employeeId = useCurrentEmployeeId();
  const [kind, setKind] = useState<"recurring" | "date">("recurring");
  const [weekday, setWeekday] = useState(1);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [available, setAvailable] = useState(true);
  const [offStart, setOffStart] = useState("");
  const [offEnd, setOffEnd] = useState("");
  const [offStartTime, setOffStartTime] = useState("");
  const [offEndTime, setOffEndTime] = useState("");
  const [offReason, setOffReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"hours" | "off" | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; label: string } | null>(null);

  const windows = (company?.availability ?? []).filter((window) => window.employeeId === employeeId);
  const requests = (company?.timeOff ?? []).filter((request) => request.employeeId === employeeId);

  async function saveHours() {
    setSaving("hours");
    setError(null);
    setNotice(null);
    const result = await saveAvailabilityWindow({
      employeeId,
      kind,
      weekday,
      date,
      startTime,
      endTime,
      available,
    });
    setSaving(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setNotice(available ? "Saved the hours you can work." : "Saved the hours you cannot work.");
  }

  async function saveTimeOff() {
    setSaving("off");
    setError(null);
    setNotice(null);
    const result = await requestTimeOff({
      employeeId,
      startDate: offStart,
      endDate: offEnd || offStart,
      startTime: offStartTime,
      endTime: offEndTime,
      reason: offReason,
    });
    setSaving(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setNotice("Time-off request sent. Your manager still needs to approve it.");
    setOffReason("");
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setError(null);
    setNotice(null);
    const result = pendingRemove.label.startsWith("Time off")
      ? await cancelTimeOff(pendingRemove.id, employeeId)
      : await removeAvailabilityWindow(pendingRemove.id, employeeId);
    setPendingRemove(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setNotice("Removed.");
  }

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Tell your manager when you can work, and ask for time off. This is for scheduling, not a legal hours check."
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
        <LoadingState variant="cards" rows={2} label="Loading your availability" />
      ) : (
        <div className="grid gap-8">
          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">Hours you can work</h3>
            <div className="grid gap-3 rounded-md border border-border bg-surface p-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={kind === "recurring" ? "primary" : "secondary"} onClick={() => setKind("recurring")}>
                  Every week
                </Button>
                <Button size="sm" variant={kind === "date" ? "primary" : "secondary"} onClick={() => setKind("date")}>
                  One date
                </Button>
              </div>
              {kind === "recurring" ? (
                <label className="grid gap-1 text-xs text-zinc-400">
                  Day
                  <select
                    className="h-10 rounded-md border border-border bg-zinc-950 px-3 text-sm text-foreground"
                    value={weekday}
                    onChange={(event) => setWeekday(Number(event.target.value))}
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                <Input
                  label="End"
                  type="time"
                  value={endTime}
                  hint="An earlier end time finishes the next morning."
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={available ? "primary" : "secondary"} onClick={() => setAvailable(true)}>
                  I can work
                </Button>
                <Button size="sm" variant={!available ? "primary" : "secondary"} onClick={() => setAvailable(false)}>
                  I cannot work
                </Button>
              </div>
              <Button className="w-full sm:w-auto" loading={saving === "hours"} disabled={saving !== null} onClick={() => void saveHours()}>
                Save hours
              </Button>
            </div>
            {windows.length === 0 ? (
              <p className="text-sm text-zinc-500">You have not added hours yet.</p>
            ) : (
              <ul className="grid gap-2">
                {windows.map((window) => (
                  <li key={window.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground">
                        {window.kind === "recurring"
                          ? `Every ${WEEKDAYS.find((day) => day.value === window.weekday)?.label ?? "week"}`
                          : formatShiftDay(window.date ?? "")}
                        {" · "}
                        {formatTimeRange(window.startTime, window.endTime)}
                      </p>
                      <Badge variant={window.available ? "success" : "warning"}>
                        {window.available ? "Can work" : "Cannot work"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPendingRemove({
                          id: window.id,
                          label: "These hours",
                        })
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">Time off</h3>
            <div className="grid gap-3 rounded-md border border-border bg-surface p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="First day" type="date" value={offStart} onChange={(event) => setOffStart(event.target.value)} />
                <Input label="Last day" type="date" value={offEnd} onChange={(event) => setOffEnd(event.target.value)} />
                <Input label="Start time (optional)" type="time" value={offStartTime} onChange={(event) => setOffStartTime(event.target.value)} />
                <Input label="End time (optional)" type="time" value={offEndTime} onChange={(event) => setOffEndTime(event.target.value)} />
              </div>
              <Input label="Note (optional)" value={offReason} onChange={(event) => setOffReason(event.target.value)} />
              <Button className="w-full sm:w-auto" loading={saving === "off"} disabled={saving !== null} onClick={() => void saveTimeOff()}>
                Request time off
              </Button>
            </div>
            {requests.length === 0 ? (
              <p className="text-sm text-zinc-500">No time-off requests.</p>
            ) : (
              <ul className="grid gap-2">
                {requests.map((request) => (
                  <li key={request.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground">
                        {formatShiftDay(request.startDate)}
                        {request.endDate !== request.startDate ? ` – ${formatShiftDay(request.endDate)}` : ""}
                        {request.startTime && request.endTime
                          ? ` · ${formatTimeRange(request.startTime, request.endTime)}`
                          : ""}
                      </p>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "success"
                            : request.status === "rejected"
                              ? "cancelled"
                              : "pending"
                        }
                      >
                        {request.status === "approved"
                          ? "Approved"
                          : request.status === "rejected"
                            ? "Rejected"
                            : "Waiting"}
                      </Badge>
                    </div>
                    {request.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingRemove({ id: request.id, label: "Time off request" })}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Modal
        open={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        title="Remove this?"
        description="This only changes your availability. It does not take you off a shift you already accepted."
      >
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setPendingRemove(null)}>
            Keep it
          </Button>
          <Button size="sm" variant="danger" onClick={() => void confirmRemove()}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
