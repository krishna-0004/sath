import React from "react";

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Screen reader only utility component that hides content visually while keeping it fully accessible.
 */
export function VisuallyHidden({ children, ...props }: VisuallyHiddenProps): React.JSX.Element {
  return (
    <span
      className="absolute h-px w-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]"
      {...props}
    >
      {children}
    </span>
  );
}
