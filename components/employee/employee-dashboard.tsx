import Link from "next/link";
import { EmployeeShiftList } from "@/components/employee/employee-shift-list";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function EmployeeDashboard() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your upcoming shifts and availability at a glance."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/employee/availability" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Update availability
              </Button>
            </Link>
            <Link href="/employee/shifts" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                View all shifts
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-8">
        <section>
          <SectionHeader
            title="Upcoming shifts"
            description="Confirm or cancel shifts assigned to you."
            action={
              <Link
                href="/employee/shifts"
                className="inline-flex min-h-9 items-center text-xs text-zinc-400 transition-colors hover:text-foreground"
              >
                See all
              </Link>
            }
          />
          <EmployeeShiftList
            limit={3}
            emptyMessage="No upcoming shifts yet"
            emptyDescription="When a manager assigns you, they will show up here."
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>
              Keep your open dates up to date so managers can plan coverage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              className="px-0 py-4"
              title="No availability submitted"
              description="Share your open dates so managers can plan coverage."
              action={
                <Link href="/employee/availability">
                  <Button size="sm">Submit availability</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
