import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "success"
  | "warning";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-border bg-zinc-900 text-zinc-300",
  pending: "border-amber-900/50 bg-amber-950/40 text-amber-200",
  confirmed: "border-emerald-900/50 bg-emerald-950/40 text-emerald-200",
  cancelled: "border-border bg-zinc-900 text-zinc-500",
  success: "border-emerald-900/50 bg-emerald-950/40 text-emerald-200",
  warning: "border-amber-900/50 bg-amber-950/40 text-amber-200",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
