import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmployeeAvailabilityPanel() {
  return (
    <div>
      <PageHeader
        title="Availability"
        description="Mark the dates you can work so managers can schedule you."
      />

      <Card>
        <CardHeader>
          <CardTitle>Your availability</CardTitle>
          <CardDescription>
            Submit and update availability by date. Notes are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-zinc-500">
            Availability form coming next. This space will list dates you marked
            as available or unavailable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
