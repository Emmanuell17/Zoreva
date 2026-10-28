"use client";

import { Button } from "@/components/ui/button";

export function ShiftActionNotice({
  error,
  success,
  onRetry,
}: {
  error: string | null;
  success: string | null;
  onRetry: (() => void) | null;
}) {
  if (error) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2" role="alert">
        <p className="text-sm text-red-400">{error}</p>
        {onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (!success) return null;

  return (
    <p className="mb-3 text-sm text-emerald-200" role="status">
      {success}
    </p>
  );
}
