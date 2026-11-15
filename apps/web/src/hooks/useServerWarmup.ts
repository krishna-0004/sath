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
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const cleanupTimers = useCallback(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }, []);

  const checkHealth = useCallback(async (): Promise<void> => {
    cleanupTimers();
    setIsReady(false);
    setHasFailed(false);

    // After 3 seconds of waiting, indicate the server is waking up
    timeoutTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsWaking(true);
      }
    }, 3000);

    const startTime = Date.now();
    const MAX_WAIT_MS = 90000;

    const poll = async (): Promise<void> => {
      try {
        await apiRequest("/health", { method: "GET", timeoutMs: 10000 });
        if (!isMountedRef.current) return;
        cleanupTimers();
        setIsWaking(false);
        setIsReady(true);
        setHasFailed(false);
      } catch {
        if (!isMountedRef.current) return;
        if (Date.now() - startTime < MAX_WAIT_MS) {
          // Keep polling every 3 seconds while server spins up
          pollTimerRef.current = setTimeout(poll, 3000);
        } else {
          cleanupTimers();
          setIsWaking(false);
          setHasFailed(true);
        }
      }
    };

    void poll();
  }, [cleanupTimers]);

  useEffect(() => {
    isMountedRef.current = true;
    void checkHealth();

    return () => {
      isMountedRef.current = false;
      cleanupTimers();
    };
  }, [checkHealth, cleanupTimers]);

  return {
    isWaking,
    isReady,
    hasFailed,
    retry: checkHealth,
  };
}
