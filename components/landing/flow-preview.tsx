"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const steps = [
  { id: "choose", label: "Choose" },
  { id: "confirm", label: "Confirm" },
  { id: "hours", label: "Hours" },
] as const;

const ROTATE_MS = 3600;

export function FlowPreview() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % steps.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [paused]);

  function select(index: number) {
    setActive(index);
    setPaused(true);
  }

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div
        role="tablist"
        aria-label="How a shift works"
        className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1"
      >
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            id={`flow-tab-${step.id}`}
            aria-selected={active === index}
            aria-controls="flow-panel"
            onClick={() => select(index)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
              active === index
                ? "bg-foreground text-background"
                : "text-zinc-400 hover:text-foreground",
            )}
          >
            <span className="mr-1.5 font-mono text-[10px] opacity-60">
              {index + 1}
            </span>
            {step.label}
          </button>
        ))}
      </div>

      <div className="relative rounded-[2rem] border border-border bg-background p-2 shadow-[0_30px_80px_-30px_rgba(255,255,255,0.12)]">
        <div className="rounded-[1.5rem] border border-border bg-surface">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="text-sm font-medium tracking-tight">
              {active === 0 && "Open shifts"}
              {active === 1 && "Your schedule"}
              {active === 2 && "Enter hours"}
            </p>
            <span className="h-1.5 w-10 rounded-full bg-zinc-800" aria-hidden />
          </div>

          <div
            key={active}
            id="flow-panel"
            role="tabpanel"
            aria-labelledby={`flow-tab-${steps[active].id}`}
            className="min-h-[19rem] animate-[fade-up_0.45s_ease-out_both] space-y-2.5 px-4 pb-5"
          >
            {active === 0 && <ChooseStep />}
            {active === 1 && <ConfirmStep />}
            {active === 2 && <HoursStep />}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        {active === 0 && "Pick an open shift. Overlaps and full shifts are blocked."}
        {active === 1 && "A reminder asks you to confirm before it starts."}
        {active === 2 && "After the shift, send the time you actually worked."}
      </p>
    </div>
  );
}

function ShiftRow({
  day,
  label,
  time,
  badge,
  highlight = false,
  muted = false,
}: {
  day: string;
  label: string;
  time: string;
  badge: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border px-3.5 py-3 transition-colors",
        highlight
          ? "border-zinc-600 bg-zinc-900/60"
          : "border-border bg-background/40",
        muted && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium tracking-tight">{day}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {label} · {time}
        </p>
      </div>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

function PreviewButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-10 w-full items-center justify-center rounded-md text-sm font-medium",
        variant === "primary"
          ? "bg-foreground text-background"
          : "border border-border text-zinc-300",
      )}
    >
      {children}
    </div>
  );
}

function ChooseStep() {
  return (
    <>
      <ShiftRow
        day="Tomorrow"
        label="Morning"
        time="06:00 – 14:00"
        badge={<Badge>2 spots left</Badge>}
        highlight
      />
      <ShiftRow
        day="Tomorrow"
        label="Afternoon"
        time="14:00 – 22:00"
        badge={<Badge>3 spots left</Badge>}
      />
      <ShiftRow
        day="Sat, Oct 24"
        label="Morning"
        time="06:00 – 14:00"
        badge={<Badge variant="cancelled">Full</Badge>}
        muted
      />
      <div className="pt-2">
        <PreviewButton>Choose Morning shift</PreviewButton>
      </div>
    </>
  );
}

function ConfirmStep() {
  return (
    <>
      <ShiftRow
        day="Tomorrow"
        label="Morning"
        time="06:00 – 14:00"
        badge={<Badge variant="pending">Not confirmed</Badge>}
        highlight
      />
      <div className="flex items-start gap-3 rounded-md border border-amber-900/40 bg-amber-950/20 px-3.5 py-3">
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-300"
        />
        <div>
          <p className="text-xs font-medium text-amber-100">
            Reminder · starts in 2 hours
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-200/70">
            Confirm that you are coming so your manager can plan.
          </p>
        </div>
      </div>
      <ShiftRow
        day="Fri, Oct 23"
        label="Afternoon"
        time="14:00 – 22:00"
        badge={<Badge variant="confirmed">Confirmed</Badge>}
      />
      <div className="space-y-2 pt-2">
        <PreviewButton>Confirm I am coming</PreviewButton>
      </div>
    </>
  );
}

function HoursStep() {
  return (
    <>
      <ShiftRow
        day="Yesterday"
        label="Morning"
        time="06:00 – 14:00"
        badge={<Badge variant="success">Worked</Badge>}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Start" value="06:00" />
        <Field label="End" value="14:00" />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3.5 py-3">
        <p className="text-xs text-zinc-400">Total</p>
        <p className="font-mono text-sm font-medium">8h 00m</p>
      </div>
      <div className="pt-2">
        <PreviewButton>Submit hours</PreviewButton>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3.5 py-2.5">
      <p className="text-[11px] tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}
