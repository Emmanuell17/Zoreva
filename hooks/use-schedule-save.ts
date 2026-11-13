"use client";

import { useSyncExternalStore } from "react";
import { getScheduleSaveStatus, subscribeScheduleSave } from "@/lib/company/store";

const idle = { phase: "idle" as const, message: null };

export function useScheduleSave() {
  return useSyncExternalStore(subscribeScheduleSave, getScheduleSaveStatus, () => idle);
}
