import React from "react";
import { cn } from "../../lib/cn.js";
import { Spinner } from "./Spinner.js";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "sos";
  size?: "primary" | "secondary";
  loading?: boolean;
}

const variantClasses = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 shadow-sm border border-transparent",
  secondary:
    "bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-300",
  ghost:
    "bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200 border border-transparent",
  danger: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-transparent",
  sos: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 font-bold border-2 border-white shadow-md text-xl",
};

const sizeClasses = {
  // Touch target sizes: Primary (>= 76px) for major actions, Secondary (>= 56px) for standard actions
  primary: "min-h-[76px] px-8 text-xl font-medium rounded-2xl gap-3",
  secondary: "min-h-[56px] px-6 text-lg font-medium rounded-xl gap-2",
};

/**
 * Accessible button enforcing touch target sizes (76px / 56px) and ARIA states.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "secondary",
      loading = false,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center transition-colors duration-150 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";
