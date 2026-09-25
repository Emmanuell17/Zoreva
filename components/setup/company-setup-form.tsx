"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@/lib/services/schedule";
import { templateDefaults } from "@/lib/company/defaults";
import { ownerIdFromAuth, persistNewCompanyWorkspace } from "@/lib/company/store";
import {
  hasFieldErrors,
  validateCount,
  validateEmail,
  validateRequired,
  validateTimeRange,
  type FieldErrors,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

type ShiftDraft = {
  name: string;
  startTime: string;
  endTime: string;
  slots: string;
};

type FormState = {
  companyName: string;
  managerName: string;
  email: string;
  employeeCount: string;
  shiftCount: string;
  shifts: ShiftDraft[];
};

const steps = [
  { title: "Your company", hint: "Who is using Zoreva." },
  { title: "Team size", hint: "How many people and how many shifts in a day." },
  { title: "Shift times", hint: "Name each shift and set the hours." },
] as const;

function draftFromIndex(index: number): ShiftDraft {
  const preset = templateDefaults(index);
  return {
    name: preset.name,
    startTime: preset.startTime,
    endTime: preset.endTime,
    slots: String(preset.slots),
  };
}

function resizeShifts(current: ShiftDraft[], count: number): ShiftDraft[] {
  const next = current.slice(0, count);
  while (next.length < count) {
    next.push(draftFromIndex(next.length));
  }
  return next;
}

export function CompanySetupForm() {
  const router = useRouter();
  const { user, configured, signOut, setRole } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    companyName: "",
    managerName: user?.displayName ?? "",
    email: user?.email ?? "",
    employeeCount: "12",
    shiftCount: "2",
    shifts: [draftFromIndex(0), draftFromIndex(1)],
  }));
  const [errors, setErrors] = useState<FieldErrors>({} as FieldErrors);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setForm((current) => ({
      ...current,
      managerName: current.managerName || user?.displayName || "",
      email: current.email || user?.email || "",
    }));
  }, [user]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateShift(index: number, patch: Partial<ShiftDraft>) {
    setForm((current) => ({
      ...current,
      shifts: current.shifts.map((shift, shiftIndex) =>
        shiftIndex === index ? { ...shift, ...patch } : shift,
      ),
    }));
  }

  function validateStep(index: number): FieldErrors {
    if (index === 0) {
      return {
        companyName: validateRequired(form.companyName, "Company name"),
        managerName: validateRequired(form.managerName, "Manager name"),
        email: validateEmail(form.email),
      };
    }

    if (index === 1) {
      const shiftCountError = validateCount(form.shiftCount, "Number of shifts", 1, 6);
      return {
        employeeCount: validateCount(form.employeeCount, "Number of employees", 1, 200),
        shiftCount: shiftCountError,
      };
    }

    const next: FieldErrors = {};
    form.shifts.forEach((shift, shiftIndex) => {
      const times = validateTimeRange(shift.startTime, shift.endTime);
      next[`shift-${shiftIndex}-name`] = validateRequired(shift.name, "Shift name");
      next[`shift-${shiftIndex}-startTime`] = times.startTime;
      next[`shift-${shiftIndex}-endTime`] = times.endTime;
      next[`shift-${shiftIndex}-slots`] = validateCount(
        shift.slots,
        "Workers needed",
        1,
        50,
      );
    });
    return next;
  }

  function goNext() {
    const nextErrors = validateStep(step);
    setErrors(nextErrors);
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(nextErrors).map((key) => [key, true])),
    }));
    if (hasFieldErrors(nextErrors)) return;

    if (step === 1) {
      setForm((current) => ({
        ...current,
        shifts: resizeShifts(current.shifts, Number(current.shiftCount)),
      }));
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function handleSubmit() {
    const nextErrors = validateStep(2);
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const ownerId = ownerIdFromAuth({ uid: user?.uid, configured });
    if (!ownerId) return;

    setSubmitting(true);
    setRole("ADMIN");
    try {
      await persistNewCompanyWorkspace(ownerId, {
        companyName: form.companyName,
        managerName: form.managerName,
        email: user?.email || form.email,
        employeeCount: Number(form.employeeCount),
        shiftTemplates: form.shifts.map((shift) => ({
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          slots: Number(shift.slots),
          positions: [],
        })),
      });
      router.replace("/admin");
    } catch {
      setErrors({
        companyName: "Could not save the company. Check Firestore is enabled, then try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          First-time setup
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight text-foreground">
          Set up your company
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          A few details so Zoreva matches how your factory or warehouse already works.
        </p>
      </div>

      <ol className="mt-6 flex items-center justify-center gap-2" aria-label="Setup steps">
        {steps.map((item, index) => (
          <li key={item.title} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                index === step
                  ? "bg-foreground text-background"
                  : index < step
                    ? "bg-zinc-700 text-foreground"
                    : "bg-zinc-900 text-zinc-500",
              )}
            >
              {index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span className="h-px w-6 bg-zinc-800" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-sm text-zinc-400">
        {steps[step].title}
        <span className="mt-0.5 block text-xs text-zinc-600">{steps[step].hint}</span>
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {step === 0 ? (
          <>
            <Input
              label="Company name"
              name="companyName"
              value={form.companyName}
              placeholder="e.g. North Yard Packing"
              error={touched.companyName ? errors.companyName : undefined}
              onChange={(event) => setField("companyName", event.target.value)}
            />
            <Input
              label="Manager name"
              name="managerName"
              value={form.managerName}
              placeholder="Your name"
              error={touched.managerName ? errors.managerName : undefined}
              onChange={(event) => setField("managerName", event.target.value)}
            />
            <Input
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              placeholder="you@company.com"
              error={touched.email ? errors.email : undefined}
              onChange={(event) => setField("email", event.target.value)}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Input
              label="How many employees"
              name="employeeCount"
              type="number"
              min={1}
              max={200}
              value={form.employeeCount}
              hint="You can add names later. This sets up the team size."
              error={touched.employeeCount ? errors.employeeCount : undefined}
              onChange={(event) => setField("employeeCount", event.target.value)}
            />
            <Input
              label="How many different shifts in a day"
              name="shiftCount"
              type="number"
              min={1}
              max={6}
              value={form.shiftCount}
              hint="Example: Morning and Afternoon is 2."
              error={touched.shiftCount ? errors.shiftCount : undefined}
              onChange={(event) => {
                const value = event.target.value;
                setField("shiftCount", value);
                const parsed = Number(value);
                if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 6) {
                  setForm((current) => ({
                    ...current,
                    shiftCount: value,
                    shifts: resizeShifts(current.shifts, parsed),
                  }));
                }
              }}
            />
          </>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5">
            {form.shifts.map((shift, index) => (
              <fieldset
                key={`shift-${index}`}
                className="rounded-md border border-border p-3"
              >
                <legend className="px-1 text-xs font-medium text-zinc-400">
                  Shift {index + 1}
                </legend>
                <div className="flex flex-col gap-3">
                  <Input
                    label="Shift name"
                    name={`shift-${index}-name`}
                    value={shift.name}
                    placeholder="e.g. Morning"
                    error={
                      touched[`shift-${index}-name`]
                        ? errors[`shift-${index}-name`]
                        : undefined
                    }
                    onChange={(event) => updateShift(index, { name: event.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Start"
                      name={`shift-${index}-startTime`}
                      type="time"
                      value={shift.startTime}
                      error={
                        touched[`shift-${index}-startTime`]
                          ? errors[`shift-${index}-startTime`]
                          : undefined
                      }
                      onChange={(event) =>
                        updateShift(index, { startTime: event.target.value })
                      }
                    />
                    <Input
                      label="End"
                      name={`shift-${index}-endTime`}
                      type="time"
                      value={shift.endTime}
                      error={
                        touched[`shift-${index}-endTime`]
                          ? errors[`shift-${index}-endTime`]
                          : undefined
                      }
                      onChange={(event) =>
                        updateShift(index, { endTime: event.target.value })
                      }
                    />
                  </div>
                  <Input
                    label="Workers needed"
                    name={`shift-${index}-slots`}
                    type="number"
                    min={1}
                    max={50}
                    value={shift.slots}
                    error={
                      touched[`shift-${index}-slots`]
                        ? errors[`shift-${index}-slots`]
                        : undefined
                    }
                    onChange={(event) => updateShift(index, { slots: event.target.value })}
                  />
                </div>
              </fieldset>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setStep((current) => current - 1)}
            >
              Back
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button type="button" className="flex-1" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              loading={submitting}
              onClick={() => void handleSubmit()}
            >
              Create company
            </Button>
          )}
        </div>
      </div>

      {configured ? (
        <p className="mt-6 text-center text-xs text-zinc-600">
          <button
            type="button"
            className="underline-offset-4 hover:text-zinc-400 hover:underline"
            onClick={() => void signOut().then(() => router.replace("/login"))}
          >
            Sign out
          </button>
        </p>
      ) : null}
    </div>
  );
}
