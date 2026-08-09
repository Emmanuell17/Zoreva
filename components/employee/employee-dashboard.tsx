import Link from "next/link";
import { EmployeeShiftList } from "@/components/employee/employee-shift-list";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmployeeDashboard() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your upcoming shifts and availability at a glance."
        actions={
          <>
            <Link href="/employee/availability">
              <Button variant="secondary" size="sm">
                Update availability
              </Button>
            </Link>
            <Link href="/employee/shifts">
              <Button variant="ghost" size="sm">
                View all shifts
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium tracking-tight text-foreground">
                Upcoming shifts
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Confirm or cancel shifts assigned to you.
              </p>
            </div>
            <Link
              href="/employee/shifts"
              className="text-xs text-zinc-400 transition-colors hover:text-foreground"
            >
              See all
            </Link>
          </div>
          <EmployeeShiftList
            limit={3}
            emptyMessage="No upcoming shifts yet. When a manager assigns you, they will show up here."
          />
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Availability</CardTitle>
                <CardDescription>
                  Keep your open dates up to date so managers can plan coverage.
                </CardDescription>
              </div>
              <Badge variant="default">Ready</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              You have not submitted availability for upcoming dates.
            </p>
            <div className="mt-4">
              <Link href="/employee/availability">
                <Button size="sm">Submit availability</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
