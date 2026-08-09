import { ShiftCard } from "@/components/shifts/shift-card";
import type { Shift } from "@/types";

type ShiftCardListProps = {
  shifts: Shift[];
  emptyMessage?: string;
  getEmployeeName?: (employeeId: string) => string | undefined;
  renderActions?: (shift: Shift) => React.ReactNode;
};

export function ShiftCardList({
  shifts,
  emptyMessage = "No shifts to show.",
  getEmployeeName,
  renderActions,
}: ShiftCardListProps) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
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
