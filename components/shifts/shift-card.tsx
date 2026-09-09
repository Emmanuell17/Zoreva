import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn, formatDayLabel, formatTimeRange } from "@/lib/utils";

type ShiftCardProps = {
  date: string | Date;
  startTime: string;
  endTime: string;
  label?: string | null;
  note?: string | null;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  muted?: boolean;
  className?: string;
};

export function ShiftCard({
  date,
  startTime,
  endTime,
  label,
  note,
  badges,
  meta,
  actions,
  muted = false,
  className,
}: ShiftCardProps) {
  return (
    <Card className={cn("overflow-hidden", muted && "opacity-70", className)}>
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight text-foreground">
            {formatDayLabel(date)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {label ? `${label} · ` : ""}
            {formatTimeRange(startTime, endTime)}
          </p>
          {meta ? <div className="mt-1.5 text-xs text-zinc-500">{meta}</div> : null}
        </div>
        {badges ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {badges}
          </div>
        ) : null}
      </div>

      {note ? (
        <CardContent className="border-t border-border pt-3">
          <p className="text-xs leading-relaxed text-zinc-500">{note}</p>
        </CardContent>
      ) : null}

      {actions ? (
        <CardFooter className="justify-stretch gap-2 sm:justify-end [&>button]:flex-1 sm:[&>button]:flex-none">
          {actions}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function SpotsBadge({ remaining, slots }: { remaining: number; slots: number }) {
  if (remaining <= 0) {
    return <Badge variant="cancelled">Full</Badge>;
  }

  return (
    <Badge variant="default">
      {remaining} {remaining === 1 ? "spot" : "spots"} left
      <span className="sr-only">
        {` of ${slots}`}
      </span>
    </Badge>
  );
}
