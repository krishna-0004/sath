import React from "react";
import { ErrorState } from "../components/ui/ErrorState.js";

/**
 * Fallback error page component.
 */
export function ErrorPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <ErrorState
        title="Unexpected Error"
        message="An unexpected condition occurred. Please reload the application or return home."
        onRetry={() => {
          window.location.href = "/";
        }}
      />
    </div>
  );
}
