import { cn } from "@/lib/utils";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border bg-surface [-webkit-overflow-scrolling:touch]">
      <table
        className={cn(
          "w-full min-w-[40rem] border-collapse text-left text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn("border-b border-border bg-zinc-950/60", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn("transition-colors hover:bg-zinc-900/40", className)}
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
      className={cn("px-4 py-3 text-sm text-zinc-400", className)}
      {...props}
    />
  );
}
