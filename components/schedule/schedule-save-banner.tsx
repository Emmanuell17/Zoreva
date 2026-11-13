"use client";

import { Button } from "@/components/ui/button";
import { useScheduleSave } from "@/hooks/use-schedule-save";
import { retryScheduleSave } from "@/lib/company/store";
import { cn } from "@/lib/utils";

export function ScheduleSaveBanner() {
  const status = useScheduleSave();
  if (status.phase === "idle") return null;

  const failed = status.phase === "failed";
  const label =
    status.phase === "saving" ? "Saving…" : status.phase === "saved" ? "Saved" : status.message;

  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
        failed
          ? "border-amber-900/80 bg-amber-950/50 text-amber-200"
          : "border-border bg-surface text-zinc-300",
      )}
    >
      <p>{label}</p>
      {failed ? (
        <Button size="sm" variant="secondary" onClick={() => void retryScheduleSave()}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
