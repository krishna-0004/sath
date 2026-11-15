import React from "react";
import { useRouteError } from "react-router-dom";
import { reportError } from "../../lib/report-error.js";
import { Button } from "../ui/Button.js";

/**
 * Route-level error boundary component for React Router errorElement.
 */
export function RouteErrorBoundary(): React.JSX.Element {
  const error = useRouteError();

  React.useEffect(() => {
    reportError(error, { context: "RouteErrorBoundary" });
  }, [error]);

  return (
    <div
      role="alert"
      className="p-8 my-8 max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm text-center"
    >
      <h2 className="text-2xl font-bold text-stone-900 mb-3">Unable to display page</h2>
      <p className="text-lg text-stone-600 mb-6">An error occurred while loading this view.</p>
      <Button
        variant="primary"
        size="secondary"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload page
      </Button>
    </div>
  );
}
