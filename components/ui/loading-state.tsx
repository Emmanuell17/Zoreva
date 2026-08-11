import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type LoadingStateVariant = "default" | "list" | "table" | "cards";

type LoadingStateProps = {
  label?: string;
  variant?: LoadingStateVariant;
  rows?: number;
  columns?: number;
  className?: string;
  compact?: boolean;
};

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-zinc-800/80", className)}
      aria-hidden
    />
  );
}

export function LoadingState({
  label = "Loading…",
  variant = "default",
  rows = 4,
  columns = 5,
  className,
  compact = false,
}: LoadingStateProps) {
  if (variant === "list") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("divide-y divide-border", className)}
      >
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className={cn("px-4", compact ? "py-3" : "py-4")}>
            <SkeletonBar className="h-3.5 w-2/5" />
            <SkeletonBar className="mt-2 h-3 w-4/5" />
            <SkeletonBar className="mt-2 h-2.5 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div role="status" aria-label={label} className={cn("w-full", className)}>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }, (_, colIndex) => (
              <SkeletonBar
                key={colIndex}
                className={cn(
                  "h-3",
                  colIndex === 0 ? "w-3/4" : "w-full",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("grid gap-3", className)}
      >
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="rounded-md border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SkeletonBar className="h-3.5 w-1/3" />
                <SkeletonBar className="mt-2 h-3 w-1/2" />
                <SkeletonBar className="mt-3 h-2.5 w-2/5" />
              </div>
              <SkeletonBar className="h-5 w-16 shrink-0 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-3 py-8" : "px-4 py-10",
        className,
      )}
    >
      <Spinner size="md" label={label} />
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
