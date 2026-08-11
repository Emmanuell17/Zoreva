"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  CURRENT_EMPLOYEE_ID,
  getEmployeeName,
  getEmployees,
  getSwappableShifts,
} from "@/lib/services";
import { cn, formatDate, formatTimeRange } from "@/lib/utils";
import {
  hasFieldErrors,
  validateOptionalMessage,
  validateRequired,
  type FieldErrors,
} from "@/lib/validation";
import type { Shift, ShiftSwapRequest } from "@/types";

type ShiftSwapFormProps = {
  open: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSubmit: (request: ShiftSwapRequest) => void;
};

type SwapFields = "toEmployeeId" | "message";

export function ShiftSwapForm({
  open,
  shift,
  onClose,
  onSubmit,
}: ShiftSwapFormProps) {
  const teammates = useMemo(
    () =>
      getEmployees().filter((employee) => employee.id !== CURRENT_EMPLOYEE_ID),
    [],
  );
  const swappableShifts = useMemo(() => getSwappableShifts(), []);

  const [toEmployeeId, setToEmployeeId] = useState(teammates[0]?.id ?? "");
  const [toShiftId, setToShiftId] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors<SwapFields>>({});
  const [touched, setTouched] = useState<Partial<Record<SwapFields, boolean>>>(
    {},
  );

  const teammateShifts = swappableShifts.filter(
    (item) => item.employeeId === toEmployeeId,
  );

  function resetForm(nextEmployeeId = teammates[0]?.id ?? "") {
    setToEmployeeId(nextEmployeeId);
    setToShiftId("");
    setMessage("");
    setErrors({});
    setTouched({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateSwap(
    nextEmployeeId = toEmployeeId,
    nextMessage = message,
  ): FieldErrors<SwapFields> {
    return {
      toEmployeeId: validateRequired(nextEmployeeId, "Teammate"),
      message: validateOptionalMessage(nextMessage),
    };
  }

  function handleEmployeeChange(employeeId: string) {
    setToEmployeeId(employeeId);
    setToShiftId("");
    if (touched.toEmployeeId || errors.toEmployeeId) {
      setErrors(validateSwap(employeeId, message));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift) return;

    setTouched({ toEmployeeId: true, message: true });
    const nextErrors = validateSwap();
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    onSubmit({
      id: `swap_${Date.now()}`,
      fromShiftId: shift.id,
      fromEmployeeId: CURRENT_EMPLOYEE_ID,
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
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
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
              onBlur={() =>
                setTouched((current) => ({ ...current, toEmployeeId: true }))
              }
              className={cn(
                "h-10 w-full rounded-md border bg-zinc-950 px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
                touched.toEmployeeId && errors.toEmployeeId
                  ? "border-red-800"
                  : "border-zinc-800",
              )}
            >
              <option value="">Select a teammate</option>
              {teammates.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {touched.toEmployeeId && errors.toEmployeeId ? (
              <p className="text-xs text-red-400">{errors.toEmployeeId}</p>
            ) : null}
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
              onChange={(event) => setToShiftId(event.target.value)}
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
            {toEmployeeId && teammateShifts.length === 0 ? (
              <p className="text-xs text-zinc-600">
                {getEmployeeName(toEmployeeId)} has no upcoming shifts to trade.
              </p>
            ) : null}
          </div>

          <Input
            label="Message (optional)"
            name="message"
            value={message}
            error={touched.message ? errors.message : undefined}
            onChange={(event) => {
              setMessage(event.target.value);
              if (touched.message || errors.message) {
                setErrors(validateSwap(toEmployeeId, event.target.value));
              }
            }}
            onBlur={() => {
              setTouched((current) => ({ ...current, message: true }));
              setErrors(validateSwap());
            }}
            placeholder="e.g. Can you cover this for me?"
          />

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
