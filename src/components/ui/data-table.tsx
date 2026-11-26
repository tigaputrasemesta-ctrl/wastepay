import * as React from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./skeleton";

interface ResponsiveTableContainerProps {
  loading?: boolean;
  skeletonCols?: number;
  skeletonRows?: number;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  mobileView?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive wrapper ensuring desktop tables never clip horizontally
 * and optionally paired with stacked mobile cards on <md screens.
 */
export function ResponsiveTableContainer({
  loading = false,
  skeletonCols = 5,
  skeletonRows = 5,
  isEmpty = false,
  emptyState,
  mobileView,
  children,
  className,
}: ResponsiveTableContainerProps) {
  if (loading) {
    return <TableSkeleton cols={skeletonCols} rows={skeletonRows} className={className} />;
  }

  if (isEmpty && emptyState) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm",
          className
        )}
      >
        {emptyState}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {mobileView && <div className="md:hidden space-y-3">{mobileView}</div>}
      <div
        className={cn(
          "w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm",
          mobileView ? "hidden md:block" : "block"
        )}
      >
        {children}
      </div>
    </div>
  );
}
