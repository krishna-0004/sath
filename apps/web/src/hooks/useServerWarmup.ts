import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api-client.js";

export interface ServerWarmupState {
  isWaking: boolean;
  isReady: boolean;
  hasFailed: boolean;
  retry: () => void;
}

/**
 * Probes the backend server on startup. If the server takes > 3 seconds to respond (sleeping Render free dyno),
 * flags `isWaking: true` to display the waking banner. Resolves when the server responds 200 OK.
 */
export function useServerWarmup(): ServerWarmupState {
  const [isWaking, setIsWaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async (): Promise<void> => {
    setIsReady(false);
    setHasFailed(false);

    // After 3 seconds of waiting, indicate the server is waking up
    timeoutTimerRef.current = setTimeout(() => {
      setIsWaking(true);
    }, 3000);

    // Hard failure timeout after 90 seconds
    hardTimeoutRef.current = setTimeout(() => {
      setIsWaking(false);
      setHasFailed(true);
    }, 90000);

    try {
      await apiRequest("/health", { method: "GET", timeoutMs: 90000 });
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      setIsWaking(false);
      setIsReady(true);
      setHasFailed(false);
    } catch {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      setIsWaking(false);
      setHasFailed(true);
    }
  }, []);

  useEffect(() => {
    void checkHealth();

    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    };
  }, [checkHealth]);

  return {
    isWaking,
    isReady,
    hasFailed,
    retry: checkHealth,
  };
}
