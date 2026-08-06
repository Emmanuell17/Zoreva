import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  className,
  id,
  label,
  error,
  hint,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex w-full flex-col gap-1.5 text-left">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-zinc-400"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-md border bg-zinc-950 px-3 text-sm text-foreground",
          "placeholder:text-zinc-600",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-800" : "border-zinc-800",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
