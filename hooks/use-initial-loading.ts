"use client";

import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 450;

/**
 * Brief first-paint loading flag so list panels can show skeletons
 * while mock services remain synchronous.
 */
export function useInitialLoading(delayMs = DEFAULT_DELAY_MS): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return loading;
}
