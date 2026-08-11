import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ShiftCard } from "@/components/shifts/shift-card";
import type { Shift } from "@/types";

type ShiftCardListProps = {
  shifts: Shift[];
  emptyMessage?: string;
  emptyDescription?: string;
  loading?: boolean;
  getEmployeeName?: (employeeId: string) => string | undefined;
  renderActions?: (shift: Shift) => React.ReactNode;
};

export function ShiftCardList({
  shifts,
  emptyMessage = "No shifts to show.",
  emptyDescription,
  loading = false,
  getEmployeeName,
  renderActions,
}: ShiftCardListProps) {
  if (loading) {
    return <LoadingState variant="cards" rows={3} label="Loading shifts" />;
  }

  if (shifts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <EmptyState title={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {shifts.map((shift) => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          employeeName={getEmployeeName?.(shift.employeeId)}
          actions={renderActions?.(shift)}
        />
      ))}
    </div>
  );
}
