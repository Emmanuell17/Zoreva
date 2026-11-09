"use client";

import { PageHeader } from "@/components/layout/page-header";
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
import { useCompany } from "@/hooks/use-company";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { isJoinedMember } from "@/lib/company/membership";
import { formatDate } from "@/lib/utils";

export function AdminTeamPanel() {
  const loading = useInitialLoading();
  const company = useCompany();

  const members = (company?.employees ?? [])
    .filter((employee) => isJoinedMember(employee, company?.id ?? ""))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div>
      <PageHeader
        title="Team"
        description={
          members.length > 0
            ? `${members.length} ${members.length === 1 ? "person has" : "people have"} joined with your team code or invite link.`
            : "People who join with your team code or invite link show up here."
        }
      />

      {loading ? (
        <LoadingState variant="cards" rows={3} label="Loading team" />
      ) : members.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title="No one has joined yet"
            description="Share the team code or invite link from the Shifts page. People appear here as soon as they join."
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {members.map((member) => (
              <li
                key={member.id}
                className="rounded-md border border-border bg-surface px-4 py-3.5"
              >
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                {member.email ? (
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{member.email}</p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500">
                  Joined {formatDate(member.createdAt)}
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-foreground">
                      {member.name}
                    </TableCell>
                    <TableCell>{member.email || "—"}</TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
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
