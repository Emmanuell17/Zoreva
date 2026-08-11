import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  cn,
  formatDate,
  formatTimeRange,
  getShiftStatusLabel,
} from "@/lib/utils";
import type { Shift, ShiftStatus } from "@/types";

type ShiftCardProps = {
  shift: Shift;
  employeeName?: string;
  actions?: React.ReactNode;
  className?: string;
};

const statusVariant: Record<
  ShiftStatus,
  "pending" | "confirmed" | "cancelled"
> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

export function ShiftCard({
  shift,
  employeeName,
  actions,
  className,
}: ShiftCardProps) {
  const isCancelled = shift.status === "CANCELLED";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isCancelled && "opacity-70",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight text-foreground">
            {formatDate(shift.date)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatTimeRange(shift.startTime, shift.endTime)}
          </p>
          {employeeName ? (
            <p className="mt-1 text-xs text-zinc-500">{employeeName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge variant={statusVariant[shift.status]}>
            {getShiftStatusLabel(shift.status)}
          </Badge>
          {shift.covered ? <Badge variant="success">Covered</Badge> : null}
        </div>
      </div>

      {shift.note ? (
        <CardContent className="border-t border-border pt-3">
          <p className="text-xs leading-relaxed text-zinc-500">
            <span className="text-zinc-400">Note: </span>
            {shift.note}
          </p>
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
