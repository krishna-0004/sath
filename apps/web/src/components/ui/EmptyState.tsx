import React from "react";
import { Button } from "./Button.js";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}

/**
 * Standard empty state container with optional illustration slot.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-10 sm:p-14 text-center rounded-[20px] border border-line bg-surface shadow-xs space-y-4">
      {illustration && <div className="mb-2">{illustration}</div>}
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-ink">{title}</h3>
        <p className="text-base text-ink-muted max-w-md mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
