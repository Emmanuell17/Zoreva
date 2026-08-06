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
  default: "border-zinc-700 bg-zinc-900 text-zinc-300",
  pending: "border-amber-900/60 bg-amber-950/50 text-amber-200",
  confirmed: "border-emerald-900/60 bg-emerald-950/50 text-emerald-200",
  cancelled: "border-zinc-700 bg-zinc-900 text-zinc-500",
  success: "border-emerald-900/60 bg-emerald-950/50 text-emerald-200",
  warning: "border-amber-900/60 bg-amber-950/50 text-amber-200",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
