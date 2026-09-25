"use client";

import { useSyncExternalStore } from "react";
import {
  getCurrentEmployeeId,
  subscribeCompany,
} from "@/lib/company/store";

export function useCurrentEmployeeId() {
  return useSyncExternalStore(
    subscribeCompany,
    getCurrentEmployeeId,
    getCurrentEmployeeId,
  );
}
