import { notificationsSeed } from "@/lib/mocks/notifications";
import type { AppNotification } from "@/types";

let notifications: AppNotification[] = notificationsSeed.map((item) => ({
  ...item,
}));
let notificationsSnapshot = notifications.map((item) => ({ ...item }));

const listeners = new Set<() => void>();

function notify() {
  notificationsSnapshot = notifications.map((item) => ({ ...item }));
  listeners.forEach((listener) => listener());
}

export function getNotifications(): AppNotification[] {
  return notificationsSnapshot;
}

export function markNotificationRead(id: string) {
  notifications = notifications.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
  notify();
}

export function markAllNotificationsRead() {
  notifications = notifications.map((item) => ({ ...item, read: true }));
  notify();
}

export function subscribeNotifications(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
