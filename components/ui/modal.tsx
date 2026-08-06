"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 w-full max-w-md rounded-md border border-zinc-800 bg-background shadow-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0 text-left">
            <h2
              id="modal-title"
              className="text-sm font-medium tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-zinc-500">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 px-2"
          >
            <span aria-hidden className="text-base leading-none">
              ×
            </span>
          </Button>
        </div>
        <div className="px-4 py-4 text-left">{children}</div>
      </div>
    </div>
  );
}
