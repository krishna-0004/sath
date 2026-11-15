import React from "react";
import { cn } from "../../lib/cn.js";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

/**
 * Accessible form field label.
 */
export function Label({ children, className, htmlFor, ...props }: LabelProps): React.JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-lg font-medium text-stone-900 mb-2 select-none", className)}
      {...props}
    >
      {children}
    </label>
  );
}
