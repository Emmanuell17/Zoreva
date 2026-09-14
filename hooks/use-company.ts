"use client";

import { useSyncExternalStore } from "react";
import { getActiveCompany, subscribeCompany } from "@/lib/company/store";

export function useCompany() {
  return useSyncExternalStore(
    subscribeCompany,
    getActiveCompany,
    () => null,
  );
}
