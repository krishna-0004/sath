import React from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";

/**
 * Polite status banner warning the user when the internet connection is lost.
 */
export function OfflineBanner(): React.JSX.Element | null {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Offline status announcement"
      className="bg-stone-900 text-white px-4 py-3 text-center text-base font-medium shadow-md"
    >
      You are currently offline. Changes will sync when your connection is restored.
    </aside>
  );
}
