"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { shiftPresets } from "@/lib/shift-presets";
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

type CreateShiftFormProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateShiftInput[]) => void;
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
  return {
    date: tomorrowDate(),
    startTime: shiftPresets[0].startTime,
    endTime: shiftPresets[0].endTime,
    slots: "4",
    label: shiftPresets[0].label,
    note: "",
  };
}

export function CreateShiftForm({
  open,
  onClose,
  onCreate,
}: CreateShiftFormProps) {
  const days = upcomingDays();
  const [severalDays, setSeveralDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([days[0]?.value ?? ""]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    shiftPresets[0].label,
  ]);
  const [form, setForm] = useState<FormState>(getDefaultFormState);
  const [errors, setErrors] = useState<FieldErrors<CreateShiftFields>>({});
  const [touched, setTouched] = useState<Partial<Record<CreateShiftFields, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    if (touched[key as CreateShiftFields] || errors[key as CreateShiftFields]) {
      setErrors(validateCreateShift(nextForm));
    }
  }

  function applyPreset(preset: (typeof shiftPresets)[number]) {
    const nextForm = {
      ...form,
      label: preset.label,
      startTime: preset.startTime,
      endTime: preset.endTime,
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
      date: severalDays ? undefined : validateFutureDate(nextForm.date),
      startTime: severalDays ? undefined : timeErrors.startTime,
      endTime: severalDays ? undefined : timeErrors.endTime,
      slots: validateSlots(nextForm.slots),
      note: validateOptionalNote(nextForm.note),
    } satisfies FieldErrors<CreateShiftFields>;
  }

  function handleClose() {
    setForm(getDefaultFormState());
    setSeveralDays(false);
    setSelectedDays([days[0]?.value ?? ""]);
    setSelectedPresets([shiftPresets[0].label]);
    setErrors({});
    setTouched({});
    setSubmitting(false);
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
    if (hasFieldErrors(nextErrors)) return;
    if (severalDays && (selectedDays.length === 0 || selectedPresets.length === 0)) {
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 200));

    const slots = Number(form.slots);
    const note = form.note.trim() || null;

    if (severalDays) {
      const inputs: CreateShiftInput[] = [];
      for (const date of selectedDays) {
        for (const presetLabel of selectedPresets) {
          const preset = shiftPresets.find((item) => item.label === presetLabel);
          if (!preset) continue;
          inputs.push({
            date,
            startTime: preset.startTime,
            endTime: preset.endTime,
            slots,
            label: preset.label,
            note,
          });
        }
      }
      onCreate(inputs);
    } else {
      onCreate([
        {
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          slots,
          label: form.label.trim() || null,
          note,
        },
      ]);
    }
    handleClose();
  }

  const createCount = severalDays
    ? selectedDays.length * selectedPresets.length
    : 1;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create shifts"
      description="Add one shift, or a whole week in one go."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
            onClick={() => setSeveralDays(true)}
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

        {severalDays ? (
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
              <p className="text-xs font-medium text-zinc-400">Times</p>
              <div className="grid grid-cols-2 gap-2">
                {shiftPresets.map((preset) => {
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
                {shiftPresets.map((preset) => {
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

        {!severalDays ? (
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
              ? "Creating…"
              : createCount > 1
                ? `Create ${createCount} shifts`
                : "Create shift"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
