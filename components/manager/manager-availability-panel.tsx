import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManagerAvailabilityPanel() {
  return (
    <div>
      <PageHeader
        title="Availability"
        description="Review availability per employee before building the week."
      />

      <Card>
        <CardHeader>
          <CardTitle>Team availability</CardTitle>
          <CardDescription>
            See who is open, unavailable, and any notes they left.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-zinc-500">
            Availability by employee will appear here once submissions are
            connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
