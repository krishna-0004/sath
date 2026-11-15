import React from "react";
import { CheckCircle2, AlertTriangle, Info, AlertCircle, Circle } from "lucide-react";
import { cn } from "../../lib/cn.js";

export type BadgeVariant =
  "success" | "warning" | "info" | "danger" | "neutral" | "primary" | "accent";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-[#DFF3E7] text-[#1F7A4D] border-[#1F7A4D]/30",
  warning: "bg-[#FFF1D6] text-[#8A5A00] border-[#8A5A00]/30",
  info: "bg-[#E3EEFA] text-[#1D4E89] border-[#1D4E89]/30",
  danger: "bg-[#FDE7E7] text-[#C62828] border-[#C62828]/30",
  neutral: "bg-[#F4EEE3] text-[#1B2A2F] border-[#E6DDCD]",
  primary: "bg-[#DDF1EF] text-[#0B5555] border-[#0B5555]/30",
  accent: "bg-[#FFF1D6] text-[#8A5A00] border-[#8A5A00]/30",
};

export function Badge({
  children,
  className,
  variant = "neutral",
  icon,
  ...props
}: BadgeProps): React.JSX.Element {
  const defaultIcon = (): React.ReactNode => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />;
      case "info":
        return <Info className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />;
      case "danger":
        return <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden="true" />;
      case "primary":
        return <Circle className="w-2.5 h-2.5 mr-1 fill-current shrink-0" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon ?? defaultIcon()}
      <span>{children}</span>
    </span>
  );
}
