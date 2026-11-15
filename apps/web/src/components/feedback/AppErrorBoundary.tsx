import React from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { reportError } from "../../lib/report-error.js";
import { Button } from "../ui/Button.js";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 text-center"
    >
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-3">Something went wrong</h1>
        <p className="text-stone-600 mb-6 text-lg">
          We encountered an unexpected problem. Your family thread data is safe.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="text-left text-xs bg-stone-100 p-3 rounded mb-6 overflow-auto max-h-32 text-red-700">
            {error.message}
          </pre>
        )}
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="secondary" onClick={resetErrorBoundary}>
            Try again
          </Button>
          <Button
            variant="ghost"
            size="secondary"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        reportError(error, { componentStack: info.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
