import Link from "next/link";
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

const overviewLinks = [
  {
    href: "/manager/shifts",
    title: "Shifts",
    description: "Review assignments, cancelled shifts, and coverage.",
    meta: "Needs attention",
  },
  {
    href: "/manager/employees",
    title: "Employees",
    description: "See everyone on the team in one place.",
    meta: "Team",
  },
  {
    href: "/manager/availability",
    title: "Availability",
    description: "Check who is free before you schedule the week.",
    meta: "Planning",
  },
] as const;

export function ManagerDashboard() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Coordinate coverage, review availability, and manage shifts."
        actions={
          <>
            <Link href="/manager/shifts">
              <Button variant="secondary" size="sm">
                Manage shifts
              </Button>
            </Link>
            <Link href="/manager/availability">
              <Button variant="ghost" size="sm">
                View availability
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {overviewLinks.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <Card className="h-full transition-colors hover:border-zinc-700">
                <CardHeader className="border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{item.title}</CardTitle>
                    <Badge variant="default">{item.meta}</Badge>
                  </div>
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
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Pending shifts</p>
              <p className="mt-1 text-2xl font-medium tracking-tight text-foreground">
                —
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Cancelled</p>
              <p className="mt-1 text-2xl font-medium tracking-tight text-foreground">
                —
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Employees available</p>
              <p className="mt-1 text-2xl font-medium tracking-tight text-foreground">
                —
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Coverage board</CardTitle>
                <CardDescription>
                  Cancelled and uncovered shifts will appear here for follow-up.
                </CardDescription>
              </div>
              <Badge variant="warning">Open</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              No coverage issues yet. When shifts are cancelled, mark them as
              covered from the shifts page.
            </p>
            <div className="mt-4">
              <Link href="/manager/shifts">
                <Button size="sm">Open shifts</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
