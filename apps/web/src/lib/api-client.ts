import { ApiError } from "./api-error.js";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const BASE_PATH = "/api";

/**
 * Placeholder hook point for Phase 1 transparent token refresh.
 * In Phase 1, this will handle 401 by refreshing the httpOnly session cookie and retrying.
 */
export async function refreshAndRetry<T>(requestFn: () => Promise<T>): Promise<T> {
  return requestFn();
}

/**
 * Executes an HTTP fetch against the backend /api prefix with strict error envelope parsing,
 * timeout controls, safe GET retries with jitter, and first-party credentials inclusion.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const maxRetries = method === "GET" ? 2 : 0;
  let attempt = 0;

  const execute = async (): Promise<T> => {
    while (true) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new ApiError(
          0,
          "OFFLINE",
          "You are currently offline. Please check your internet connection.",
        );
      }

      const controller = new AbortController();
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const fullUrl = path.startsWith("/") ? `${BASE_PATH}${path}` : `${BASE_PATH}/${path}`;
        const headers = new Headers(options.headers);

        let bodyPayload: BodyInit | undefined;
        if (options.body !== undefined) {
          headers.set("Content-Type", "application/json");
          bodyPayload = JSON.stringify(options.body);
        }

        const res = await fetch(fullUrl, {
          ...options,
          method,
          headers,
          body: bodyPayload,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          let errorData: {
            error?: {
              code?: string;
              message?: string;
              details?: { path: string; message: string }[];
              requestId?: string;
            };
          } | null = null;

          try {
            errorData = await res.json();
          } catch {
            // Body was not JSON (e.g. Render 502/503/504 gateway HTML)
          }

          if (errorData?.error?.code) {
            throw new ApiError(
              res.status,
              errorData.error.code,
              errorData.error.message || "Request failed",
              errorData.error.details,
              errorData.error.requestId || res.headers.get("x-request-id") || undefined,
            );
          }

          if ([502, 503, 504].includes(res.status)) {
            throw new ApiError(
              res.status,
              "SERVER_UNAVAILABLE",
              "The server is currently waking up or unavailable. Please try again in a moment.",
              undefined,
              res.headers.get("x-request-id") || undefined,
            );
          }

          throw new ApiError(
            res.status,
            "UNEXPECTED_RESPONSE",
            `Received unexpected status ${res.status} from server.`,
            undefined,
            res.headers.get("x-request-id") || undefined,
          );
        }

        if (res.status === 204) {
          return undefined as T;
        }

        return (await res.json()) as T;
      } catch (err) {
        clearTimeout(timer);

        const isTimeout = err instanceof DOMException && err.name === "AbortError";
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

        let errorToThrow: ApiError;

        if (err instanceof ApiError) {
          errorToThrow = err;
        } else if (isTimeout) {
          errorToThrow = new ApiError(408, "TIMEOUT", "Request timed out. Please try again.");
        } else if (isOffline) {
          errorToThrow = new ApiError(
            0,
            "OFFLINE",
            "You are currently offline. Please check your internet connection.",
          );
        } else {
          errorToThrow = new ApiError(
            0,
            "NETWORK_ERROR",
            "Network error occurred while connecting to the care service.",
          );
        }

        // Retry condition: Only safe GET requests on network failures or 503/504
        const isRetryableStatus =
          errorToThrow.status === 503 ||
          errorToThrow.status === 504 ||
          errorToThrow.code === "NETWORK_ERROR" ||
          errorToThrow.code === "SERVER_UNAVAILABLE";

        if (method === "GET" && isRetryableStatus && attempt < maxRetries) {
          attempt++;
          // Exponential backoff with jitter
          const backoff = Math.pow(2, attempt) * 200 + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        throw errorToThrow;
      }
    }
  };

  return refreshAndRetry(execute);
}
