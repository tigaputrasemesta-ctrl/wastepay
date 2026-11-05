import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "success";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500",
  destructive:
    "bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] dark:bg-rose-600 dark:hover:bg-rose-500",
  outline:
    "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 shadow-xs hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-50 active:scale-[0.98]",
  secondary:
    "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs hover:bg-slate-200/80 dark:hover:bg-zinc-700 active:scale-[0.98]",
  ghost:
    "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-50 active:scale-[0.98]",
  link:
    "text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline p-0 h-auto font-medium",
  success:
    "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 py-2 text-xs sm:text-sm",
  sm: "h-8 rounded-lg px-3 text-xs",
  lg: "h-10 rounded-xl px-6 text-sm font-semibold",
  icon: "h-9 w-9 rounded-lg p-0 flex items-center justify-center shrink-0",
};

export const buttonVariants = ({
  variant = "default",
  size = "default",
  className = "",
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}) => {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:pointer-events-none disabled:opacity-50 select-none",
    variantStyles[variant || "default"],
    sizeStyles[size || "default"],
    className
  );
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
