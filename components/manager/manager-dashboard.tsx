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
import {
  getEmployees,
  getManagerShifts,
  getSwapRequests,
} from "@/lib/services";
import { formatDate, formatTimeRange } from "@/lib/utils";

const overviewLinks = [
  {
    href: "/manager/shifts",
    title: "Shifts",
    description: "Review assignments, cancelled shifts, and coverage.",
  },
  {
    href: "/manager/swaps",
    title: "Swaps",
    description: "Approve or reject employee shift swap requests.",
  },
  {
    href: "/manager/employees",
    title: "Employees",
    description: "See everyone on the team in one place.",
  },
  {
    href: "/manager/availability",
    title: "Availability",
    description: "Check who is free before you schedule the week.",
  },
] as const;

export function ManagerDashboard() {
  const shifts = getManagerShifts();
  const pendingShifts = shifts.filter((shift) => shift.status === "PENDING").length;
  const cancelledShifts = shifts.filter(
    (shift) => shift.status === "CANCELLED",
  ).length;
  const pendingSwaps = getSwapRequests().filter(
    (request) => request.status === "PENDING",
  ).length;
  const employeeCount = getEmployees().filter(
    (user) => user.role === "EMPLOYEE",
  ).length;
  const uncovered = shifts.filter(
    (shift) => shift.status === "CANCELLED" && !shift.covered,
  );

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Coordinate coverage, review availability, and manage shifts."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/manager/shifts" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Manage shifts
              </Button>
            </Link>
            <Link href="/manager/availability" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                View availability
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewLinks.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <Card className="h-full transition-colors hover:border-zinc-700">
                <CardHeader className="border-b-0 py-4">
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>
              A quick look at what still needs manager action.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3 sm:gap-4">
            <div>
              <p className="text-xs tracking-wide text-zinc-500">
                Pending shifts
              </p>
              <p className="mt-1.5 text-2xl font-medium tracking-tight text-foreground">
                {pendingShifts}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-zinc-500">Cancelled</p>
              <p className="mt-1.5 text-2xl font-medium tracking-tight text-foreground">
                {cancelledShifts}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-zinc-500">
                Pending swaps
              </p>
              <p className="mt-1.5 text-2xl font-medium tracking-tight text-foreground">
                {pendingSwaps}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {employeeCount} employees on roster
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage board</CardTitle>
            <CardDescription>
              Cancelled and uncovered shifts that need follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uncovered.length === 0 ? (
              <EmptyState
                compact
                className="px-0 py-4"
                title="No coverage issues yet"
                description="When shifts are cancelled, mark them as covered from the shifts page."
                action={
                  <Link href="/manager/shifts">
                    <Button size="sm">Open shifts</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {uncovered.slice(0, 3).map((shift) => (
                  <li
                    key={shift.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-tight text-foreground">
                        Needs cover
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDate(shift.date)} ·{" "}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <Link
                      href="/manager/shifts"
                      className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-foreground"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
