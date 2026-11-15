import React from "react";
import { cn } from "../../lib/cn.js";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
}

/**
 * Accessible text input with automatic ARIA description and error linkage.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, id, "aria-describedby": customDescribedBy, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined;
    const helperId = helperText && id ? `${id}-helper` : undefined;

    const describedByIds = [customDescribedBy, errorId, helperId].filter(Boolean).join(" ");

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedByIds || undefined}
          className={cn(
            "w-full min-h-[56px] rounded-xl border px-4 py-3 text-lg text-stone-900 bg-white placeholder-stone-400 transition-colors duration-150",
            error
              ? "border-red-600 focus:border-red-600 focus:ring-red-600"
              : "border-stone-300 focus:border-teal-700",
            className,
          )}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-stone-600">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-base font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
