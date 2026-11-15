import React from "react";
import { Button } from "./Button.js";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Standard empty state container for blank list or thread states.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-stone-200 bg-white">
      <h3 className="text-2xl font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-lg text-stone-600 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
