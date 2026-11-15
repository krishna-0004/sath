import React from "react";
import { cn } from "../../lib/cn.js";

export type CardVariant = "plain" | "tinted" | "feature";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  plain: "bg-surface border-line shadow-xs",
  tinted: "bg-surface-2 border-line shadow-xs",
  feature: "bg-gradient-to-br from-surface to-primary-soft/30 border-primary-strong/20 shadow-md",
};

/**
 * Card container with 20px rounded geometry, subtle line border, and layered depth.
 */
export function Card({
  children,
  className,
  variant = "plain",
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-[20px] border p-6 sm:p-8 transition-all duration-200",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
