"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { submitHours } from "@/lib/services/schedule";
import { formatDayLabel, formatTimeRange } from "@/lib/utils";
import {
  hasFieldErrors,
  validateOptionalNote,
  validateTimeRange,
  type FieldErrors,
} from "@/lib/validation";
import type { Shift } from "@/types";

type HoursFormProps = {
  shift: Shift | null;
  onClose: () => void;
};

export function EmployeeHoursForm({ shift, onClose }: HoursFormProps) {
  if (!shift) return null;
  return <HoursFormInner key={shift.id} shift={shift} onClose={onClose} />;
}

function HoursFormInner({
  shift,
  onClose,
}: {
  shift: Shift;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<"startTime" | "endTime" | "note">>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextStart: string, nextEnd: string) {
    const timeErrors = validateTimeRange(nextStart, nextEnd);
    const nextErrors = {
      ...timeErrors,
      note: validateOptionalNote(note),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSubmitting(true);
    setError(null);
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    const result = submitHours({
      shiftId: shift.id,
      startTime: nextStart,
      endTime: nextEnd,
      note,
    });

    if (!result.ok) {
      setError(result.reason);
      setSubmitting(false);
      return;
    }

    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Enter hours"
      description={`${formatDayLabel(shift.date)} · ${formatTimeRange(shift.startTime, shift.endTime)}`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          Fill in the paper form first, then enter the same hours here.
        </p>

        {custom ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Started"
                name="startTime"
                type="time"
                value={startTime}
                error={errors.startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <Input
                label="Finished"
                name="endTime"
                type="time"
                value={endTime}
                error={errors.endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
            <Input
              label="Note (optional)"
              name="note"
              value={note}
              error={errors.note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Only if something was different"
            />
          </>
        ) : null}

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <div className="flex flex-col gap-2">
          <Button
            loading={submitting}
            onClick={() =>
              save(
                custom ? startTime : shift.startTime,
                custom ? endTime : shift.endTime,
              )
            }
          >
            {custom
              ? "Save hours"
              : `Submit ${formatTimeRange(shift.startTime, shift.endTime)}`}
          </Button>
          {custom ? (
            <Button
              variant="ghost"
              disabled={submitting}
              onClick={() => {
                setCustom(false);
                setStartTime(shift.startTime);
                setEndTime(shift.endTime);
              }}
            >
              Use scheduled times
            </Button>
          ) : (
            <Button
              variant="ghost"
              disabled={submitting}
              onClick={() => {
                setStartTime(shift.startTime);
                setEndTime(shift.endTime);
                setCustom(true);
              }}
            >
              Different hours
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
