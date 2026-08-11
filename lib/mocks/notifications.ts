import { hoursFromNow } from "@/lib/mocks/dates";
import type { AppNotification } from "@/types";

export const notificationsSeed: AppNotification[] = [
  {
    id: "notif_1",
    title: "New shift assigned",
    body: "You have a pending shift tomorrow from 09:00 to 17:00.",
    href: "/employee/shifts",
    read: false,
    createdAt: hoursFromNow(-2),
    type: "SHIFT_ASSIGNED",
  },
  {
    id: "notif_2",
    title: "Shift confirmed",
    body: "Your mid shift on Tuesday is confirmed.",
    href: "/employee/shifts",
    read: false,
    createdAt: hoursFromNow(-8),
    type: "SHIFT_UPDATED",
  },
  {
    id: "notif_3",
    title: "Availability reminder",
    body: "Submit next week's availability so managers can plan coverage.",
    href: "/employee/availability",
    read: true,
    createdAt: hoursFromNow(-26),
    type: "REMINDER",
  },
  {
    id: "notif_4",
    title: "Coverage update",
    body: "A cancelled shift was marked as covered by your manager.",
    href: "/employee/shifts",
    read: true,
    createdAt: hoursFromNow(-50),
    type: "COVERAGE",
  },
];
