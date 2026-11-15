import React from "react";
import { cn } from "../../lib/cn.js";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={cn("rounded-xl shimmer bg-surface-2", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
