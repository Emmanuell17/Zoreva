import { AvailabilityForm } from "@/components/employee/availability-form";
import { PageHeader } from "@/components/layout/page-header";

export function EmployeeAvailabilityPanel() {
  return (
    <div>
      <PageHeader
        title="Availability"
        description="Mark the dates you can work so managers can schedule you."
      />

      <AvailabilityForm />
    </div>
  );
}
