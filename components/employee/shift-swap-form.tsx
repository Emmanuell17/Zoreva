"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  getMockEmployees,
  getSwappableShifts,
  getUserName,
  MOCK_EMPLOYEE_ID,
} from "@/lib/mock-data";
import { cn, formatDate, formatTimeRange } from "@/lib/utils";
import type { Shift, ShiftSwapRequest } from "@/types";

type ShiftSwapFormProps = {
  open: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSubmit: (request: ShiftSwapRequest) => void;
};

export function ShiftSwapForm({
  open,
  shift,
  onClose,
  onSubmit,
}: ShiftSwapFormProps) {
  const teammates = useMemo(
    () =>
      getMockEmployees().filter((employee) => employee.id !== MOCK_EMPLOYEE_ID),
    [],
  );
  const swappableShifts = useMemo(() => getSwappableShifts(), []);

  const [toEmployeeId, setToEmployeeId] = useState(teammates[0]?.id ?? "");
  const [toShiftId, setToShiftId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const teammateShifts = swappableShifts.filter(
    (item) => item.employeeId === toEmployeeId,
  );

  function resetForm(nextEmployeeId = teammates[0]?.id ?? "") {
    setToEmployeeId(nextEmployeeId);
    setToShiftId("");
    setMessage("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleEmployeeChange(employeeId: string) {
    setToEmployeeId(employeeId);
    setToShiftId("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift) return;

    if (!toEmployeeId) {
      setError("Choose a teammate to request a swap with.");
      return;
    }

    onSubmit({
      id: `swap_${Date.now()}`,
      fromShiftId: shift.id,
      fromEmployeeId: MOCK_EMPLOYEE_ID,
      toEmployeeId,
      toShiftId: toShiftId || null,
      message: message.trim() || null,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request shift swap"
      description="Offer one of your shifts to a teammate."
    >
      {shift ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-3">
            <p className="text-xs text-zinc-500">Your shift</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(shift.date)}
            </p>
            <p className="text-xs text-zinc-400">
              {formatTimeRange(shift.startTime, shift.endTime)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5 text-left">
            <label
              htmlFor="toEmployeeId"
              className="text-xs font-medium text-zinc-400"
            >
              Teammate
            </label>
            <select
              id="toEmployeeId"
              name="toEmployeeId"
              value={toEmployeeId}
              onChange={(event) => handleEmployeeChange(event.target.value)}
              required
              className={cn(
                "h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
              )}
            >
              {teammates.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-full flex-col gap-1.5 text-left">
            <label
              htmlFor="toShiftId"
              className="text-xs font-medium text-zinc-400"
            >
              Their shift (optional)
            </label>
            <select
              id="toShiftId"
              name="toShiftId"
              value={toShiftId}
              onChange={(event) => {
                setToShiftId(event.target.value);
                setError(null);
              }}
              className={cn(
                "h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
              )}
            >
              <option value="">No specific shift — open request</option>
              {teammateShifts.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatDate(item.date)} ·{" "}
                  {formatTimeRange(item.startTime, item.endTime)}
                </option>
              ))}
            </select>
            {teammateShifts.length === 0 ? (
              <p className="text-xs text-zinc-600">
                {getUserName(toEmployeeId)} has no upcoming shifts to trade.
              </p>
            ) : null}
          </div>

          <Input
            label="Message (optional)"
            name="message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Can you cover this for me?"
          />

          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Send request
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
