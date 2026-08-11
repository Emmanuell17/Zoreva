"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployees } from "@/lib/services";
import { formatDate } from "@/lib/utils";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import type { Role } from "@/types";

function roleLabel(role: Role): string {
  return role === "MANAGER" ? "Manager" : "Employee";
}

export function ManagerEmployeesPanel() {
  const loading = useInitialLoading();
  const employees = getEmployees();

  return (
    <div>
      <PageHeader
        title="Employees"
        description="View everyone on the team and jump into their schedule context."
        actions={
          <p className="text-xs text-zinc-500">
            {loading ? "Loading…" : `${employees.length} staff`}
          </p>
        }
      />

      {loading ? (
        <>
          <div className="md:hidden">
            <LoadingState variant="cards" rows={4} label="Loading employees" />
          </div>
          <div className="hidden overflow-hidden rounded-md border border-border bg-surface md:block">
            <LoadingState
              variant="table"
              rows={5}
              columns={5}
              label="Loading employees"
            />
          </div>
        </>
      ) : employees.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title="No employees to show yet"
            description="Team members will appear here once they are added."
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {employees.map((employee) => (
              <li
                key={employee.id}
                className="rounded-md border border-border bg-surface px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tracking-tight text-foreground">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {employee.email}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Joined {formatDate(employee.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="default">{roleLabel(employee.role)}</Badge>
                    <span className="text-[11px] text-zinc-500">Active</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium text-foreground">
                      {employee.name}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant="default">{roleLabel(employee.role)}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(employee.createdAt)}</TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">
                      Active
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
