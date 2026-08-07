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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Card>
          <CardHeader>
            <CardTitle>Upcoming shifts</CardTitle>
            <CardDescription>
              Confirm or cancel shifts assigned to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-zinc-500"
                  >
                    No upcoming shifts yet. When a manager assigns you, they
                    will show up here.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
