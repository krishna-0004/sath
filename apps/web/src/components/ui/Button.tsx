import React from "react";
import { cn } from "../../lib/cn.js";
import { Spinner } from "./Spinner.js";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "sos";
  size?: "primary" | "secondary";
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const variantClasses = {
  primary:
    "bg-[#0F6B6B] text-white hover:bg-[#0B5555] active:bg-[#083E3E] shadow-sm border border-transparent",
  secondary:
    "bg-[#F4EEE3] text-[#1B2A2F] hover:bg-[#E6DDCD] active:bg-[#D5C9B5] border border-[#E6DDCD]",
  ghost:
    "bg-transparent text-[#1B2A2F] hover:bg-[#F4EEE3] active:bg-[#E6DDCD] border border-transparent",
  danger:
    "bg-[#C62828] text-white hover:bg-[#A32020] active:bg-[#801818] border border-transparent",
  sos: "bg-[#C62828] text-white hover:bg-[#A32020] active:bg-[#801818] font-black border-2 border-white shadow-xl text-2xl tracking-wide",
};

const sizeClasses = {
  // Touch target sizes: Primary (>= 76px) for major actions, Secondary (>= 56px) for standard actions
  primary: "min-h-[76px] px-8 text-xl font-bold rounded-full gap-3",
  secondary: "min-h-[56px] px-6 text-lg font-bold rounded-full gap-2",
};

/**
 * Accessible pill button enforcing touch target sizes (76px / 56px), ARIA states, and icon slots.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "secondary",
      loading = false,
      leadingIcon,
      trailingIcon,
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
          "inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed press",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {!loading && leadingIcon}
        <span>{children}</span>
        {!loading && trailingIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
