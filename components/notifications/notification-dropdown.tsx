"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { mockEmployeeNotifications } from "@/lib/mock-data";
import { formatNotificationTime } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
      />
    </svg>
  );
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    mockEmployeeNotifications.map((item) => ({ ...item })),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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

  const preview = notifications.slice(0, 4);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-100" />
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-zinc-800 bg-background"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-xs text-zinc-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0}
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {preview.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-zinc-500">
                No notifications yet.
              </li>
            ) : (
              preview.map((notification) => (
                <li key={notification.id} className="border-b border-zinc-800/80 last:border-b-0">
                  <Link
                    href={notification.href ?? "/employee/notifications"}
                    role="menuitem"
                    onClick={() => {
                      markAsRead(notification.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "block px-3 py-3 transition-colors hover:bg-zinc-900/70",
                      !notification.read && "bg-zinc-950",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {!notification.read ? (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-200" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-zinc-800 px-3 py-2">
            <Link
              href="/employee/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-1.5 text-center text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-foreground"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
