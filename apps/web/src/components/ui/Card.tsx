import React from "react";
import { cn } from "../../lib/cn.js";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Card container with rounded-2xl geometry, gentle border, and calm elevation.
 */
export function Card({ children, className, ...props }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn("rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}
