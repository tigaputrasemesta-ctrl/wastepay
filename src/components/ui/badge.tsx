import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

const BADGE_STYLES: Record<StatusVariant, string> = {
  success:
    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70",
  warning:
    "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70",
  danger:
    "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/70",
  info:
    "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/70",
  neutral:
    "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
}

export function StatusBadge({
  variant = "neutral",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight",
        BADGE_STYLES[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
