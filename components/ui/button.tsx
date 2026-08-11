import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-zinc-200 disabled:hover:bg-foreground",
  secondary:
    "border border-border bg-transparent text-foreground hover:bg-zinc-900 disabled:hover:bg-transparent",
  ghost:
    "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-foreground disabled:hover:bg-transparent",
  danger:
    "bg-red-950 text-red-200 hover:bg-red-900 disabled:hover:bg-red-950",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  loading = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          label="Loading"
          className={
            variant === "primary"
              ? "border-zinc-400 border-t-background"
              : undefined
          }
        />
      ) : null}
      {children}
    </button>
  );
}
