"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { mockEmployeeNotifications } from "@/lib/mock-data";
import { formatNotificationTime } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    mockEmployeeNotifications.map((item) => ({ ...item })),
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  }

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay up to date on shifts, coverage, and availability."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        }
      />

      <div className="rounded-md border border-zinc-800">
        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">
            No notifications yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href ?? "/employee"}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "block px-4 py-4 transition-colors hover:bg-zinc-900/50",
                    !notification.read && "bg-zinc-950/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                        {notification.body}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read ? (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-200" />
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
