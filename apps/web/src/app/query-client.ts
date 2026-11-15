import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "../lib/api-error.js";
import { reportError } from "../lib/report-error.js";

type ToastNotifier = (message: string, type?: "error" | "info" | "success") => void;

let globalToastNotifier: ToastNotifier | null = null;

export function setGlobalToastNotifier(notifier: ToastNotifier): void {
  globalToastNotifier = notifier;
}

/**
 * Global QueryClient instance with centralized error handling and empathetic error messages.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      reportError(error, { context: "QueryCache" });
      const friendlyMessage = getErrorMessage(error);
      if (globalToastNotifier) {
        globalToastNotifier(friendlyMessage, "error");
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      reportError(error, { context: "MutationCache" });
      const friendlyMessage = getErrorMessage(error);
      if (globalToastNotifier) {
        globalToastNotifier(friendlyMessage, "error");
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});
