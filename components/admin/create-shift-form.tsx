"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useSchedule } from "@/hooks/use-schedule";
import { getShiftPresets } from "@/lib/shift-presets";
import { calendarDayKey, isSameShiftSlot, signupsForShift } from "@/lib/shift-utils";
import { cn } from "@/lib/utils";
import {
  hasFieldErrors,
  validateFutureDate,
  validateOptionalNote,
  validateSlots,
  validateTimeRange,
  type FieldErrors,
} from "@/lib/validation";
import type { CreateShiftInput } from "@/lib/services/schedule";
import {
  getScheduleSnapshot,
  keepOnlySelectedShiftsOnDays,
} from "@/lib/services/schedule";
import type { Shift } from "@/types";

type CreateShiftFormProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateShiftInput[]) => void;
  shift?: Shift | null;
  onUpdate?: (
    shiftId: string,
    input: CreateShiftInput,
  ) => { ok: true } | { ok: false; reason: string };
};

type FormState = {
  date: string;
  startTime: string;
  endTime: string;
  slots: string;
  label: string;
  note: string;
};

type CreateShiftFields = "date" | "startTime" | "endTime" | "slots" | "note";

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function upcomingDays(count = 7): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index + 1);
    return {
      value: toDateValue(date),
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  });
}

function tomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateValue(tomorrow);
}

function getDefaultFormState(): FormState {
  const preset = getShiftPresets()[0];
  return {
    date: tomorrowDate(),
    startTime: preset.startTime,
    endTime: preset.endTime,
    slots: String(preset.slots),
    label: preset.label,
    note: "",
  };
}

function formStateFromShift(shift: Shift): FormState {
  return {
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    slots: String(shift.slots),
    label: shift.label ?? "",
    note: shift.note ?? "",
  };
}

export function CreateShiftForm({
  open,
  onClose,
  onCreate,
  shift = null,
  onUpdate,
}: CreateShiftFormProps) {
  const editing = Boolean(shift);
  const days = upcomingDays();
  const presets = getShiftPresets();
  const { signups } = useSchedule();
  const [severalDays, setSeveralDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([days[0]?.value ?? ""]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(getDefaultFormState);
  const [errors, setErrors] = useState<FieldErrors<CreateShiftFields>>({});
  const [touched, setTouched] = useState<Partial<Record<CreateShiftFields, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (shift) {
      setForm(formStateFromShift(shift));
      setSeveralDays(false);
    } else {
      setForm(getDefaultFormState());
      setSeveralDays(false);
      setSelectedDays([days[0]?.value ?? ""]);
      setSelectedPresets([]);
    }
    setErrors({});
    setTouched({});
    setSubmitting(false);
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the modal opens
  }, [open, shift]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    if (touched[key as CreateShiftFields] || errors[key as CreateShiftFields]) {
      setErrors(validateCreateShift(nextForm));
    }
  }

  function applyPreset(preset: (typeof presets)[number]) {
    const nextForm = {
      ...form,
      label: preset.label,
      startTime: preset.startTime,
      endTime: preset.endTime,
      slots: String(preset.slots),
    };
    setForm(nextForm);
    setErrors(validateCreateShift(nextForm));
  }

  function toggleDay(value: string) {
    setSelectedDays((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function togglePreset(label: string) {
    setSelectedPresets((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  function validateCreateShift(nextForm: FormState = form) {
    const timeErrors = validateTimeRange(nextForm.startTime, nextForm.endTime);

    return {
      date: severalDays && !editing ? undefined : validateFutureDate(nextForm.date),
      startTime: severalDays && !editing ? undefined : timeErrors.startTime,
      endTime: severalDays && !editing ? undefined : timeErrors.endTime,
      slots: validateSlots(nextForm.slots),
      note: validateOptionalNote(nextForm.note),
    } satisfies FieldErrors<CreateShiftFields>;
  }

  function handleClose() {
    setForm(getDefaultFormState());
    setSeveralDays(false);
    setSelectedDays([days[0]?.value ?? ""]);
    setSelectedPresets([]);
    setErrors({});
    setTouched({});
    setSubmitting(false);
    setNotice(null);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      date: true,
      startTime: true,
      endTime: true,
      slots: true,
      note: true,
    });

    const nextErrors = validateCreateShift();
    setErrors(nextErrors);
    setNotice(null);
    if (hasFieldErrors(nextErrors)) return;
    if (!editing && severalDays && (selectedDays.length === 0 || selectedPresets.length === 0)) {
      setNotice(
        selectedDays.length === 0
          ? "Pick at least one day."
          : "Pick the times you want on those days.",
      );
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 200));

    const slots = Number(form.slots);
    const note = form.note.trim() || null;
    const presetPositions =
      presets.find((item) => item.label === form.label)?.positions ?? null;

    if (editing && shift) {
      const taken = signupsForShift(signups, shift.id).length;
      if (slots < taken) {
        setNotice(
          `${taken} ${taken === 1 ? "person has" : "people have"} already chosen this shift. Keep at least ${taken} spots.`,
        );
        setSubmitting(false);
        return;
      }

      const input: CreateShiftInput = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        slots,
        label: form.label.trim() || null,
        note,
        positions: presetPositions ?? shift.positions ?? null,
      };

      const duplicate = getScheduleSnapshot().shifts.some(
        (item) => item.id !== shift.id && isSameShiftSlot(item, input),
      );
      if (duplicate) {
        setNotice("That shift already exists for this day and time.");
        setSubmitting(false);
        return;
      }

      const result = onUpdate?.(shift.id, input) ?? { ok: true as const };
      if (!result.ok) {
        setNotice(result.reason);
        setSubmitting(false);
        return;
      }

      handleClose();
      return;
    }

    const inputs: CreateShiftInput[] = severalDays
      ? selectedDays.flatMap((date) =>
          selectedPresets.flatMap((presetLabel) => {
            const preset = presets.find((item) => item.label === presetLabel);
            if (!preset) return [];
            return [
              {
                date,
                startTime: preset.startTime,
                endTime: preset.endTime,
                slots: preset.slots || slots,
                label: preset.label,
                note,
                positions: preset.positions,
              },
            ];
          }),
        )
      : [
          {
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            slots,
            label: form.label.trim() || null,
            note,
            positions:
              presets.find((item) => item.label === form.label)?.positions ?? null,
          },
        ];

    if (severalDays) {
      keepOnlySelectedShiftsOnDays(selectedDays, inputs);
    }

    const currentShifts = getScheduleSnapshot().shifts;
    const fresh = inputs.filter(
      (input) => !currentShifts.some((item) => isSameShiftSlot(item, input)),
    );
    const duplicateCount = inputs.length - fresh.length;

    if (severalDays) {
      if (fresh.length > 0) onCreate(fresh);
      handleClose();
      return;
    }

    if (duplicateCount > 0 && fresh.length === 0) {
      setNotice("That shift already exists for this day and time.");
      setSubmitting(false);
      return;
    }

    if (fresh.length > 0) {
      onCreate(fresh);
    }

    if (duplicateCount > 0) {
      setNotice(
        `Added ${fresh.length}. ${duplicateCount} already existed and ${duplicateCount === 1 ? "was" : "were"} skipped.`,
      );
      setSubmitting(false);
      return;
    }

    handleClose();
  }

  const createCount = severalDays && !editing
    ? selectedDays.length * selectedPresets.length
    : 1;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? "Edit shift" : "Create shifts"}
      description={
        editing
          ? "Change the day, time, name, or how many people are needed."
          : "Add one shift, or a whole week in one go."
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {editing ? null : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSeveralDays(false)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              !severalDays
                ? "border-zinc-500 bg-zinc-900 text-foreground"
                : "border-border text-zinc-400",
            )}
          >
            One day
          </button>
          <button
            type="button"
            onClick={() => {
              setSeveralDays(true);
              setSelectedPresets([]);
            }}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              severalDays
                ? "border-zinc-500 bg-zinc-900 text-foreground"
                : "border-border text-zinc-400",
            )}
          >
            Several days
          </button>
        </div>
        )}

        {!editing && severalDays ? (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-zinc-400">Days</p>
              <div className="grid grid-cols-2 gap-2">
                {days.map((day) => {
                  const selected = selectedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm",
                        selected
                          ? "border-zinc-500 bg-zinc-900 text-foreground"
                          : "border-border text-zinc-400",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-zinc-400">Times each day</p>
              <p className="text-xs text-zinc-600">
                Only the times you tap will be on these days. Other empty times
                on those days are removed.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const selected = selectedPresets.includes(preset.label);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => togglePreset(preset.label)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm",
                        selected
                          ? "border-zinc-500 bg-zinc-900 text-foreground"
                          : "border-border text-zinc-400",
                      )}
                    >
                      <span className="block font-medium">{preset.label}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {preset.startTime} – {preset.endTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-zinc-400">Quick fill</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const selected =
                    form.label === preset.label &&
                    form.startTime === preset.startTime &&
                    form.endTime === preset.endTime;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "border-zinc-500 bg-zinc-900 text-foreground"
                          : "border-border text-zinc-400 hover:border-zinc-700 hover:text-foreground",
                      )}
                    >
                      <span className="block font-medium">{preset.label}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {preset.startTime} – {preset.endTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Date"
              name="date"
              type="date"
              value={form.date}
              error={touched.date ? errors.date : undefined}
              onChange={(event) => updateField("date", event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, date: true }))}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Start"
                name="startTime"
                type="time"
                value={form.startTime}
                error={touched.startTime ? errors.startTime : undefined}
                onChange={(event) => updateField("startTime", event.target.value)}
                onBlur={() =>
                  setTouched((current) => ({ ...current, startTime: true }))
                }
              />
              <Input
                label="End"
                name="endTime"
                type="time"
                value={form.endTime}
                error={touched.endTime ? errors.endTime : undefined}
                onChange={(event) => updateField("endTime", event.target.value)}
                onBlur={() =>
                  setTouched((current) => ({ ...current, endTime: true }))
                }
              />
            </div>
          </>
        )}

        <Input
          label="How many people"
          name="slots"
          type="number"
          min={1}
          max={50}
          value={form.slots}
          error={touched.slots ? errors.slots : undefined}
          onChange={(event) => updateField("slots", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, slots: true }))}
        />

        {!severalDays || editing ? (
          <Input
            label="Name (optional)"
            name="label"
            value={form.label}
            onChange={(event) => updateField("label", event.target.value)}
            placeholder="e.g. Morning"
          />
        ) : null}

        <Input
          label="Note (optional)"
          name="note"
          value={form.note}
          error={touched.note ? errors.note : undefined}
          onChange={(event) => updateField("note", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, note: true }))}
        />

        {notice ? (
          <p
            role="status"
            className="rounded-md border border-amber-900/80 bg-amber-950/50 px-3 py-2 text-xs leading-relaxed text-amber-200"
          >
            {notice}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={submitting}>
            {submitting
              ? editing
                ? "Saving…"
                : "Creating…"
              : editing
                ? "Save shift"
                : createCount > 1
                  ? `Create ${createCount} shifts`
                  : "Create shift"}
          </Button>
        </div>
        {!editing && severalDays && createCount > 0 ? (
          <p className="text-right text-xs text-zinc-500">
            {selectedDays.length}{" "}
            {selectedDays.length === 1 ? "day" : "days"} ×{" "}
            {selectedPresets.length}{" "}
            {selectedPresets.length === 1 ? "time" : "times"}
            {selectedPresets.length > 0
              ? ` (${selectedPresets.join(", ")} each day)`
              : ""}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
