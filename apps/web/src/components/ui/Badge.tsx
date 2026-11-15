import React from "react";
import { cn } from "../../lib/cn.js";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "accent" | "danger";
  children: React.ReactNode;
}

const variantStyles = {
  neutral: "bg-stone-100 text-stone-800 border-stone-300",
  primary: "bg-teal-50 text-teal-800 border-teal-300",
  accent: "bg-amber-50 text-amber-900 border-amber-300",
  danger: "bg-red-50 text-red-900 border-red-300",
};

/**
 * Accessible pill badge meeting WCAG contrast thresholds.
 */
export function Badge({
  children,
  className,
  variant = "neutral",
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
