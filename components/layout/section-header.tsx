import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-3 flex items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-medium tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
