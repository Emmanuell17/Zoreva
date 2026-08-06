import { cn } from "@/lib/utils";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-zinc-800">
      <table
        className={cn("w-full min-w-full border-collapse text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn("border-b border-zinc-800 bg-zinc-950/80", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return <tbody className={cn("divide-y divide-zinc-800", className)} {...props} />;
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn("transition-colors hover:bg-zinc-900/50", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium tracking-wide text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TableCellProps) {
  return (
    <td
      className={cn("px-4 py-3 text-sm text-zinc-300", className)}
      {...props}
    />
  );
}
