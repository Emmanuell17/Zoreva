import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
