"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { formatNotificationTime } from "@/lib/notifications";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/lib/services";
import { cn } from "@/lib/utils";
import { useInitialLoading } from "@/hooks/use-initial-loading";

function useNotifications() {
  return useSyncExternalStore(
    subscribeNotifications,
    getNotifications,
    getNotifications,
  );
}

export function NotificationsPanel() {
  const loading = useInitialLoading();
  const notifications = useNotifications();
  const unreadCount = notifications.filter((item) => !item.read).length;

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
            disabled={loading || unreadCount === 0}
            onClick={markAllNotificationsRead}
          >
            Mark all read
          </Button>
        }
      />

      <div className="rounded-md border border-border bg-surface">
        {loading ? (
          <LoadingState variant="list" rows={4} label="Loading notifications" />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Updates about shifts, swaps, and availability will show up here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href ?? "/employee"}
                  onClick={() => markNotificationRead(notification.id)}
                  className={cn(
                    "block px-4 py-3.5 transition-colors hover:bg-zinc-900/40",
                    !notification.read && "bg-zinc-950/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-tight text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
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
