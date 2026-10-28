"use client";

import { useCallback, useRef, useState } from "react";

type ShiftCommandResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };

export function useShiftCommand() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const retryRef = useRef<(() => Promise<void>) | null>(null);

  const run = useCallback(
    async (key: string, action: () => Promise<ShiftCommandResult>) => {
      if (pending) return;
      setPending(key);
      setError(null);
      setSuccess(null);
      setCanRetry(false);
      try {
        const result = await action();
        if (result.ok) {
          setSuccess(result.message);
          retryRef.current = null;
          return;
        }
        setError(result.reason);
        retryRef.current = () => run(key, action);
        setCanRetry(true);
      } catch {
        setError("Could not save the shift. Check your connection and try again.");
        retryRef.current = () => run(key, action);
        setCanRetry(true);
      } finally {
        setPending(null);
      }
    },
    [pending],
  );

  const retry = useCallback(() => {
    void retryRef.current?.();
  }, []);

  return { pending, error, success, canRetry, run, retry };
}
