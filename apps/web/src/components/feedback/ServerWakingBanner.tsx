import React from "react";
import { useServerWarmup } from "../../hooks/useServerWarmup.js";
import { Button } from "../ui/Button.js";
import { Spinner } from "../ui/Spinner.js";

export function ServerWakingBanner(): React.JSX.Element | null {
  const { isWaking, hasFailed, retry } = useServerWarmup();

  if (!isWaking && !hasFailed) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Server status announcement"
      className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 transition-all duration-200"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isWaking && <Spinner size="sm" role="presentation" className="text-amber-700" />}
          <p className="text-base font-medium">
            {isWaking && "Waking up the server, this can take up to a minute."}
            {hasFailed && "The server is taking longer than usual to wake up."}
          </p>
        </div>
        {hasFailed && (
          <Button
            variant="secondary"
            size="secondary"
            onClick={retry}
            className="!min-h-[44px] text-base"
          >
            Retry connection
          </Button>
        )}
      </div>
    </aside>
  );
}
