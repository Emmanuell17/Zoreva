"use client";

import { useSyncExternalStore } from "react";
import {
  getScheduleSnapshot,
  subscribeSchedule,
} from "@/lib/services/schedule";

export function useSchedule() {
  return useSyncExternalStore(
    subscribeSchedule,
    getScheduleSnapshot,
    getScheduleSnapshot,
  );
}
