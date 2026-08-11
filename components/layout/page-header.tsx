import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {/* Title already appears in the mobile navbar; show it from md up. */}
        <h2 className="hidden text-xl font-medium tracking-tight text-foreground md:block">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 md:mt-1.5">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
