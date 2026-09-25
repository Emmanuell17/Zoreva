import { getCurrentEmployeeId, subscribeCompany } from "@/lib/company/store";
import {
  getScheduleSnapshot,
  subscribeSchedule,
  type ScheduleSnapshot,
} from "@/lib/services/schedule";
import { formatDayLabel, formatTimeRange } from "@/lib/utils";
import {
  hoursForSignup,
  isPastShift,
  isUpcomingShift,
  startOfDay,
  toDate,
} from "@/lib/shift-utils";
import type { AppNotification } from "@/types";

const readIds = new Set<string>();
const extraListeners = new Set<() => void>();

let notificationsSnapshot: AppNotification[] = [];

function rebuild(state: ScheduleSnapshot = getScheduleSnapshot()) {
  notificationsSnapshot = buildReminders(getCurrentEmployeeId(), state);
}

function emit() {
  extraListeners.forEach((listener) => listener());
}

subscribeSchedule(() => {
  rebuild();
  emit();
});

subscribeCompany(() => {
  rebuild();
  emit();
});

rebuild();

export function subscribeNotifications(listener: () => void) {
  extraListeners.add(listener);
  return () => {
    extraListeners.delete(listener);
  };
}

export function buildReminders(
  employeeId: string = getCurrentEmployeeId(),
  state: ScheduleSnapshot = getScheduleSnapshot(),
): AppNotification[] {
  const mine = state.signups.filter(
    (signup) => signup.employeeId === employeeId,
  );
  const reminders: AppNotification[] = [];

  for (const signup of mine) {
    const shift = state.shifts.find((item) => item.id === signup.shiftId);
    if (!shift) continue;

    const when = `${formatDayLabel(shift.date)} · ${formatTimeRange(shift.startTime, shift.endTime)}`;

    if (isUpcomingShift(shift) && signup.status !== "CONFIRMED") {
      reminders.push({
        id: `confirm:${signup.id}`,
        title: "Confirm your shift",
        body: `Please confirm you are coming: ${when}.`,
        href: "/employee/schedule",
        read: readIds.has(`confirm:${signup.id}`),
        createdAt: signup.selectedAt,
        type: "CONFIRM",
      });
    }

    if (
      isUpcomingShift(shift) &&
      signup.status === "CONFIRMED" &&
      isTodayOrTomorrow(shift.date)
    ) {
      reminders.push({
        id: `shift:${signup.id}`,
        title: "Upcoming shift",
        body: `You are confirmed for ${when}.`,
        href: "/employee/schedule",
        read: readIds.has(`shift:${signup.id}`),
        createdAt: signup.confirmedAt ?? signup.selectedAt,
        type: "SHIFT",
      });
    }

    if (
      isPastShift(shift) &&
      !hoursForSignup(state.hours, shift.id, employeeId)
    ) {
      reminders.push({
        id: `hours:${signup.id}`,
        title: "Enter your hours",
        body: `Your ${when} shift is done. Enter the hours you worked.`,
        href: "/employee/hours",
        read: readIds.has(`hours:${signup.id}`),
        createdAt: shift.date,
        type: "HOURS",
      });
    }
  }

  const rank = { CONFIRM: 0, HOURS: 1, SHIFT: 2 } as const;
  return reminders.sort(
    (a, b) =>
      rank[a.type] - rank[b.type] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function isTodayOrTomorrow(date: string | Date): boolean {
  const diffDays = Math.round(
    (startOfDay(toDate(date)).getTime() - startOfDay(new Date()).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return diffDays === 0 || diffDays === 1;
}

export function getNotifications(): AppNotification[] {
  return notificationsSnapshot;
}

export function markNotificationRead(id: string) {
  readIds.add(id);
  rebuild();
  emit();
}

export function markAllNotificationsRead() {
  for (const reminder of notificationsSnapshot) {
    readIds.add(reminder.id);
  }
  rebuild();
  emit();
}
