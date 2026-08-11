"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getEmployees } from "@/lib/services";
import { cn } from "@/lib/utils";
import {
  hasFieldErrors,
  validateFutureDate,
  validateOptionalNote,
  validateRequired,
  validateTimeRange,
  type FieldErrors,
} from "@/lib/validation";

export type CreateShiftInput = {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

type CreateShiftFormProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateShiftInput) => void;
};

type FormState = {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

type CreateShiftFields =
  | "employeeId"
  | "date"
  | "startTime"
  | "endTime"
  | "note";

function getDefaultFormState(employees: { id: string }[]): FormState {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);

  return {
    employeeId: employees[0]?.id ?? "",
    date,
    startTime: "09:00",
    endTime: "17:00",
    note: "",
  };
}

export function CreateShiftForm({
  open,
  onClose,
  onCreate,
}: CreateShiftFormProps) {
  const employees = getEmployees();
  const [form, setForm] = useState<FormState>(() =>
    getDefaultFormState(employees),
  );
  const [errors, setErrors] = useState<FieldErrors<CreateShiftFields>>({});
  const [touched, setTouched] = useState<
    Partial<Record<CreateShiftFields, boolean>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    if (touched[key as CreateShiftFields] || errors[key as CreateShiftFields]) {
      setErrors(validateCreateShift(nextForm));
    }
  }

  function validateCreateShift(nextForm: FormState = form) {
    const timeErrors = validateTimeRange(nextForm.startTime, nextForm.endTime);

    return {
      employeeId: validateRequired(nextForm.employeeId, "Employee"),
      date: validateFutureDate(nextForm.date),
      startTime: timeErrors.startTime,
      endTime: timeErrors.endTime,
      note: validateOptionalNote(nextForm.note),
    } satisfies FieldErrors<CreateShiftFields>;
  }

  function handleClose() {
    setForm(getDefaultFormState(employees));
    setErrors({});
    setTouched({});
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      employeeId: true,
      date: true,
      startTime: true,
      endTime: true,
      note: true,
    });

    const nextErrors = validateCreateShift();
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    onCreate({
      employeeId: form.employeeId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      note: form.note.trim() || null,
    });
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create shift"
      description="Assign a new shift to an employee."
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex w-full flex-col gap-1.5 text-left">
          <label
            htmlFor="employeeId"
            className="text-xs font-medium text-zinc-400"
          >
            Employee
          </label>
          <select
            id="employeeId"
            name="employeeId"
            value={form.employeeId}
            onChange={(event) => updateField("employeeId", event.target.value)}
            onBlur={() =>
              setTouched((current) => ({ ...current, employeeId: true }))
            }
            className={cn(
              "h-10 w-full rounded-md border bg-zinc-950 px-3 text-sm text-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
              touched.employeeId && errors.employeeId
                ? "border-red-800"
                : "border-zinc-800",
            )}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          {touched.employeeId && errors.employeeId ? (
            <p className="text-xs text-red-400">{errors.employeeId}</p>
          ) : null}
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
            label="Start time"
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
            label="End time"
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

        <Input
          label="Note (optional)"
          name="note"
          value={form.note}
          error={touched.note ? errors.note : undefined}
          onChange={(event) => updateField("note", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, note: true }))}
          placeholder="e.g. Opening coverage"
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
            {submitting ? "Creating…" : "Create shift"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
