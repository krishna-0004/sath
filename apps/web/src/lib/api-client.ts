import { ApiError } from "./api-error.js";
import { env } from "./env.js";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
  skipRedirectOnAuthFailure?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;
const API_BASE_URL = (env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const BASE_PATH = `${API_BASE_URL}/api`;
export const AUTH_EXPIRED_EVENT = "saath:auth-expired";

let inFlightRefreshPromise: Promise<void> | null = null;

export function isAuthLoopRoute(path: string): boolean {
  const normalized = path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) : path;
  return (
    normalized.startsWith("/auth/refresh") ||
    normalized.startsWith("/auth/logout") ||
    normalized.startsWith("/auth/demo") ||
    normalized.startsWith("/auth/google")
  );
}

export function emitAuthExpired(redirect = true): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    if (redirect && window.location.pathname !== "/login") {
      try {
        window.location.href = "/login";
      } catch {
        // jsdom navigation guard
      }
    }
  }
}

async function executeRefresh(): Promise<void> {
  const res = await fetch(`${BASE_PATH}/auth/refresh`, {
    method: "POST",
    headers: {
      "X-Saath-CSRF": "1",
    },
    credentials: "include",
  });

  if (res.status === 204) {
    return;
  }

  if (res.status === 409) {
    // REFRESH_RACE: winner already rotated cookie, wait for leeway propagation
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  let errorData: { error?: { code?: string; message?: string } } | null = null;
  try {
    errorData = await res.json();
  } catch {
    // non-json body
  }

  throw new ApiError(
    res.status,
    errorData?.error?.code || "UNAUTHENTICATED",
    errorData?.error?.message || "Session expired. Please sign in again.",
  );
}

export async function requestTokenRefresh(): Promise<void> {
  if (!inFlightRefreshPromise) {
    inFlightRefreshPromise = executeRefresh().finally(() => {
      inFlightRefreshPromise = null;
    });
  }
  return inFlightRefreshPromise;
}

/**
 * Placeholder hook point for transparent token refresh.
 */
export async function refreshAndRetry<T>(requestFn: () => Promise<T>): Promise<T> {
  return requestFn();
}

/**
 * Executes an HTTP fetch against the backend /api prefix with strict error envelope parsing,
 * timeout controls, safe GET retries with jitter, single-flight refresh on 401, and CSRF protection.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const maxRetries = method === "GET" ? 2 : 0;
  let attempt = 0;
  let hasRefreshed = false;

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
        headers.set("X-Saath-CSRF", "1");

        let bodyPayload: BodyInit | undefined;
        if (options.body !== undefined) {
          if (typeof FormData !== "undefined" && options.body instanceof FormData) {
            bodyPayload = options.body;
          } else {
            headers.set("Content-Type", "application/json");
            bodyPayload = JSON.stringify(options.body);
          }
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
            // Body was not JSON
          }

          // Single-flight refresh on 401
          if (
            res.status === 401 &&
            !hasRefreshed &&
            !options.skipAuthRefresh &&
            !isAuthLoopRoute(path)
          ) {
            hasRefreshed = true;
            try {
              await requestTokenRefresh();
              return await execute();
            } catch (refreshErr) {
              emitAuthExpired(!options.skipRedirectOnAuthFailure);
              throw refreshErr;
            }
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
          const backoff = Math.pow(2, attempt) * 200 + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        throw errorToThrow;
      }
    }
  };

  return execute();
}
