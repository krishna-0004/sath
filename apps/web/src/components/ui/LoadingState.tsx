import React from "react";
import { Spinner } from "./Spinner.js";

export interface LoadingStateProps {
  message?: string;
}

/**
 * Standard loading state container with accessible status announcement.
 */
export function LoadingState({
  message = "Loading information...",
}: LoadingStateProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <Spinner size="lg" role="presentation" className="text-teal-700 mb-4" />
      <p className="text-lg text-stone-700 font-medium">{message}</p>
    </div>
  );
}
