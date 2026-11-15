import React from "react";
import { Button } from "./Button.js";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Standard error state container with optional retry trigger.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this information. Please try again.",
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 rounded-2xl border border-red-200 bg-red-50/50 text-center max-w-lg mx-auto"
    >
      <h3 className="text-xl font-bold text-red-900 mb-2">{title}</h3>
      <p className="text-base text-red-800 mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
