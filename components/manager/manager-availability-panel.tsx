import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
          <EmptyState
            compact
            className="px-0 py-4"
            title="No availability submissions yet"
            description="Once employees submit their weekly availability, it will appear here."
            action={
              <Link href="/manager/employees">
                <Button size="sm" variant="secondary">
                  View employees
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
