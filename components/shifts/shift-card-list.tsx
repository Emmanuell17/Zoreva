import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

type ShiftCardListProps = {
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function ShiftCardList({
  children,
  loading = false,
  empty = false,
  emptyTitle = "Nothing to show yet",
  emptyDescription,
  emptyAction,
}: ShiftCardListProps) {
  if (loading) {
    return <LoadingState variant="cards" rows={3} label="Loading shifts" />;
  }

  if (empty) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return <div className="grid gap-3">{children}</div>;
}
