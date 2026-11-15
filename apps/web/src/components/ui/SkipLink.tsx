import React from "react";
import { cn } from "../../lib/cn.js";

export interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

/**
 * Accessible keyboard navigation skip link to main landmark.
 */
export function SkipLink({ targetId = "main", className }: SkipLinkProps): React.JSX.Element {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-teal-800 focus:text-white focus:rounded-xl focus:shadow-lg focus:font-bold focus:outline-none",
        className,
      )}
    >
      Skip to main content
    </a>
  );
}
