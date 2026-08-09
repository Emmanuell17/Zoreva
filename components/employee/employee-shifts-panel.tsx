import Link from "next/link";
import { EmployeeShiftList } from "@/components/employee/employee-shift-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export function EmployeeShiftsPanel() {
  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Confirm, cancel, or request a swap for assigned shifts."
        actions={
          <Link href="/employee/swaps">
            <Button variant="secondary" size="sm">
              View swaps
            </Button>
          </Link>
        }
      />

      <EmployeeShiftList emptyMessage="No shifts assigned yet." />
    </div>
  );
}
