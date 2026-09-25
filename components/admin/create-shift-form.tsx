"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useSchedule } from "@/hooks/use-schedule";
import { updateShiftTemplateTimes } from "@/lib/company/store";
import { getShiftPresets } from "@/lib/shift-presets";
import { calendarDayKey, isSameShiftSlot, signupsForShift } from "@/lib/shift-utils";
import { cn } from "@/lib/utils";
import {
  hasFieldErrors,
  parsePositions,
  validateFutureDate,
  validateOptionalNote,
  validatePositions,
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
  roles: string;
};

type CreateShiftFields = "date" | "startTime" | "endTime" | "slots" | "note" | "roles";

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
    date.setDate(date.getDate() + index);
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return {
      value: toDateValue(date),
      label: index === 0 ? `Today · ${weekday}` : weekday,
    };
  });
}

function todayDate(): string {
  return toDateValue(new Date());
}

function getDefaultFormState(): FormState {
  const preset = getShiftPresets()[0];
  return {
    date: todayDate(),
    startTime: preset.startTime,
    endTime: preset.endTime,
    slots: String(preset.slots),
    label: preset.label,
    note: "",
    roles: "",
  };
}

type PresetTimes = Record<string, { startTime: string; endTime: string }>;

function timesFromPresets(): PresetTimes {
  return Object.fromEntries(
    getShiftPresets().map((preset) => [
      preset.label,
      { startTime: preset.startTime, endTime: preset.endTime },
    ]),
  );
}

function formStateFromShift(shift: Shift): FormState {
  return {
    date: calendarDayKey(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    slots: String(shift.slots),
    label: shift.label ?? "",
    note: shift.note ?? "",
    roles: (shift.positions ?? []).join(", "),
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
  const [severalDays, setSeveralDays] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(() =>
    upcomingDays().map((day) => day.value),
  );
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [presetTimes, setPresetTimes] = useState<PresetTimes>(timesFromPresets);
  const [presetTimeErrors, setPresetTimeErrors] = useState<Record<string, string>>({});
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
      setSelectedPresets([]);
    } else {
      setForm(getDefaultFormState());
      setSeveralDays(true);
      setSelectedDays(days.map((day) => day.value));
      setSelectedPresets([]);
      setPresetTimes(timesFromPresets());
    }
    setPresetTimeErrors({});
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
    setPresetTimeErrors({});
  }

  function updatePresetTime(
    label: string,
    key: "startTime" | "endTime",
    value: string,
  ) {
    const current = presetTimes[label] ?? {
      startTime: presets.find((item) => item.label === label)?.startTime ?? "08:00",
      endTime: presets.find((item) => item.label === label)?.endTime ?? "16:00",
    };
    const nextTimes = { ...current, [key]: value };
    setPresetTimes((existing) => ({
      ...existing,
      [label]: nextTimes,
    }));
    const range = validateTimeRange(nextTimes.startTime, nextTimes.endTime);
    setPresetTimeErrors((existing) => ({
      ...existing,
      [`${label}-startTime`]: range.startTime ?? "",
      [`${label}-endTime`]: range.endTime ?? "",
    }));
  }

  function validateSelectedPresetTimes() {
    const next: Record<string, string> = {};
    for (const label of selectedPresets) {
      const preset = presets.find((item) => item.label === label);
      const times = presetTimes[label] ?? preset;
      if (!times) continue;
      const range = validateTimeRange(times.startTime, times.endTime);
      if (range.startTime) next[`${label}-startTime`] = range.startTime;
      if (range.endTime) next[`${label}-endTime`] = range.endTime;
    }
    return next;
  }

  function validateCreateShift(nextForm: FormState = form) {
    const timeErrors = validateTimeRange(nextForm.startTime, nextForm.endTime);

    const usingPresets = !editing && selectedPresets.length > 0;
    return {
      date: severalDays && !editing ? undefined : validateFutureDate(nextForm.date),
      startTime: (severalDays || usingPresets) && !editing ? undefined : timeErrors.startTime,
      endTime: (severalDays || usingPresets) && !editing ? undefined : timeErrors.endTime,
      slots: validateSlots(nextForm.slots),
      note: validateOptionalNote(nextForm.note),
      roles: validatePositions(nextForm.roles),
    } satisfies FieldErrors<CreateShiftFields>;
  }

  function handleClose() {
    setForm(getDefaultFormState());
    setSeveralDays(true);
    setSelectedDays(days.map((day) => day.value));
    setSelectedPresets([]);
    setPresetTimes(timesFromPresets());
    setPresetTimeErrors({});
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
      roles: true,
    });

    const nextErrors = validateCreateShift();
    setErrors(nextErrors);
    setNotice(null);
    if (hasFieldErrors(nextErrors)) return;
    if (!editing && severalDays && selectedDays.length === 0) {
      setNotice("Pick at least one day.");
      return;
    }
    if (!editing && severalDays && selectedPresets.length === 0) {
      setNotice("Pick the times you want on those days.");
      return;
    }
    if (!editing && selectedPresets.length > 0) {
      const nextPresetErrors = validateSelectedPresetTimes();
      setPresetTimeErrors(nextPresetErrors);
      if (Object.values(nextPresetErrors).some(Boolean)) return;
    }

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 200));

    const slots = Number(form.slots);
    const note = form.note.trim() || null;
    const roles = parsePositions(form.roles);

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
        positions: roles,
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

    const dates = severalDays ? selectedDays : [form.date];
    const selectedTimes = selectedPresets.flatMap((presetLabel) => {
      const preset = presets.find((item) => item.label === presetLabel);
      if (!preset) return [];
      const times = presetTimes[presetLabel] ?? preset;
      return [
        {
          ...preset,
          startTime: times.startTime,
          endTime: times.endTime,
        },
      ];
    });

    const inputs: CreateShiftInput[] =
      !editing && selectedTimes.length > 0
        ? dates.flatMap((date) =>
            selectedTimes.map((preset) => ({
              date,
              startTime: preset.startTime,
              endTime: preset.endTime,
              slots: preset.slots || slots,
              label: preset.label,
              note,
              positions: roles,
            })),
          )
        : [
            {
              date: form.date,
              startTime: form.startTime,
              endTime: form.endTime,
              slots,
              label: form.label.trim() || null,
              note,
              positions: roles,
            },
          ];

    if (!editing && selectedTimes.length > 0) {
      updateShiftTemplateTimes(
        selectedTimes.map((preset) => ({
          name: preset.label,
          startTime: preset.startTime,
          endTime: preset.endTime,
        })),
      );
      keepOnlySelectedShiftsOnDays(dates, inputs);
    }

    const currentShifts = getScheduleSnapshot().shifts;
    const fresh = inputs.filter(
      (input) => !currentShifts.some((item) => isSameShiftSlot(item, input)),
    );
    const duplicateCount = inputs.length - fresh.length;

    if (severalDays || selectedTimes.length > 0) {
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

  const createCount =
    !editing && selectedPresets.length > 0
      ? (severalDays ? selectedDays.length : 1) * selectedPresets.length
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
            onClick={() => {
              setSeveralDays(false);
              setForm((current) => ({ ...current, date: todayDate() }));
            }}
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
              setSelectedDays(days.map((day) => day.value));
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

        {editing ? (
          <>
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
        ) : (
          <>
            {severalDays ? (
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
            ) : (
              <Input
                label="Date"
                name="date"
                type="date"
                value={form.date}
                error={touched.date ? errors.date : undefined}
                onChange={(event) => updateField("date", event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, date: true }))}
              />
            )}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-zinc-400">
                {severalDays ? "Shifts each day" : "Shifts"}
              </p>
              <p className="text-xs text-zinc-600">
                Tap the shifts you want, then set the hours for each one. Other
                empty times on {severalDays ? "these days" : "this day"} are
                removed.
              </p>
              <div className="flex flex-col gap-2">
                {presets.map((preset) => {
                  const selected = selectedPresets.includes(preset.label);
                  const times = presetTimes[preset.label] ?? preset;
                  return (
                    <div
                      key={preset.label}
                      className={cn(
                        "rounded-md border px-3 py-2",
                        selected
                          ? "border-zinc-500 bg-zinc-900"
                          : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => togglePreset(preset.label)}
                        className={cn(
                          "w-full text-left text-sm",
                          selected ? "text-foreground" : "text-zinc-400",
                        )}
                      >
                        <span className="block font-medium">{preset.label}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {times.startTime} – {times.endTime}
                        </span>
                      </button>
                      {selected ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Input
                            label="Start"
                            name={`${preset.label}-startTime`}
                            type="time"
                            value={times.startTime}
                            error={
                              presetTimeErrors[`${preset.label}-startTime`] ||
                              undefined
                            }
                            onChange={(event) =>
                              updatePresetTime(
                                preset.label,
                                "startTime",
                                event.target.value,
                              )
                            }
                          />
                          <Input
                            label="End"
                            name={`${preset.label}-endTime`}
                            type="time"
                            value={times.endTime}
                            error={
                              presetTimeErrors[`${preset.label}-endTime`] ||
                              undefined
                            }
                            onChange={(event) =>
                              updatePresetTime(
                                preset.label,
                                "endTime",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedPresets.length === 0 && !severalDays ? (
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
            ) : null}
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

        {editing || (!severalDays && selectedPresets.length === 0) ? (
          <Input
            label="Name (optional)"
            name="label"
            value={form.label}
            onChange={(event) => updateField("label", event.target.value)}
            placeholder="e.g. Morning"
          />
        ) : null}

        <Input
          label="Roles"
          name="roles"
          value={form.roles}
          placeholder="Write the jobs for this shift"
          hint="Use your own names, separated by commas."
          error={touched.roles ? errors.roles : undefined}
          onChange={(event) => updateField("roles", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, roles: true }))}
        />

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
        {!editing && selectedPresets.length > 0 ? (
          <p className="text-right text-xs text-zinc-500">
            {severalDays ? selectedDays.length : 1}{" "}
            {(severalDays ? selectedDays.length : 1) === 1 ? "day" : "days"} ×{" "}
            {selectedPresets.length}{" "}
            {selectedPresets.length === 1 ? "time" : "times"}
            {` (${selectedPresets.join(", ")})`}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
