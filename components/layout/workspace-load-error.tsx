"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceError,
  retryWorkspaceLoad,
  subscribeCompany,
} from "@/lib/company/store";

export function WorkspaceLoadError() {
  const message = useSyncExternalStore(subscribeCompany, getWorkspaceError, () => null);
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-3 rounded-md border border-red-900/80 bg-red-950/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-red-100">{message}</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={() => void retryWorkspaceLoad()}
      >
        Try again
      </Button>
    </div>
  );
}
