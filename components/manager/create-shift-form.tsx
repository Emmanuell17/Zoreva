"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getMockEmployees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Shift } from "@/types";

type CreateShiftFormProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (shift: Shift) => void;
};

type FormState = {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

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
  const employees = getMockEmployees();
  const [form, setForm] = useState<FormState>(() =>
    getDefaultFormState(employees),
  );
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function handleClose() {
    setForm(getDefaultFormState(employees));
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.employeeId || !form.date || !form.startTime || !form.endTime) {
      setError("Fill in employee, date, and time.");
      return;
    }

    if (form.startTime >= form.endTime) {
      setError("End time must be after start time.");
      return;
    }

    const shift: Shift = {
      id: `shift_${Date.now()}`,
      employeeId: form.employeeId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      status: "PENDING",
      note: form.note.trim() || null,
      covered: false,
      createdAt: new Date().toISOString(),
    };

    onCreate(shift);
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create shift"
      description="Assign a new shift to an employee."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            required
            className={cn(
              "h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
            )}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={(event) => updateField("date", event.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start time"
            name="startTime"
            type="time"
            value={form.startTime}
            onChange={(event) => updateField("startTime", event.target.value)}
            required
          />
          <Input
            label="End time"
            name="endTime"
            type="time"
            value={form.endTime}
            onChange={(event) => updateField("endTime", event.target.value)}
            required
          />
        </div>

        <Input
          label="Note (optional)"
          name="note"
          value={form.note}
          onChange={(event) => updateField("note", event.target.value)}
          placeholder="e.g. Opening coverage"
        />

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Create shift
          </Button>
        </div>
      </form>
    </Modal>
  );
}
