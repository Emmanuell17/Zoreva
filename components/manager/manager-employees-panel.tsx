import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMockEmployees } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/types";

function roleLabel(role: Role): string {
  return role === "MANAGER" ? "Manager" : "Employee";
}

export function ManagerEmployeesPanel() {
  const employees = getMockEmployees();

  return (
    <div>
      <PageHeader
        title="Employees"
        description="View everyone on the team and jump into their schedule context."
        actions={
          <Badge variant="default">{employees.length} staff</Badge>
        }
      />

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
          {employees.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={5}
                className="py-10 text-center text-zinc-500"
              >
                No employees to show yet.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium text-foreground">
                  {employee.name}
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>
                  <Badge variant="default">{roleLabel(employee.role)}</Badge>
                </TableCell>
                <TableCell>{formatDate(employee.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="success">Active</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
