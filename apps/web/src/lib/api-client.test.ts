import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client.js";
import { ApiError } from "./api-error.js";

describe("API Client (src/lib/api-client.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("successfully parses valid 200 JSON response", async () => {
    const mockData = { status: "ok", count: 42 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
      headers: new Headers(),
    });

    const result = await apiRequest<{ status: string; count: number }>("/test");
    expect(result).toEqual(mockData);
  });

  it("handles 204 No Content returning undefined", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const result = await apiRequest<void>("/no-content");
    expect(result).toBeUndefined();
  });

  it("parses error envelope on non-2xx response into ApiError", async () => {
    const errorEnvelope = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid medication dose",
        details: [{ path: "dose", message: "Required" }],
        requestId: "req-12345",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => errorEnvelope,
      headers: new Headers({ "x-request-id": "req-12345" }),
    });

    await expect(apiRequest("/invalid")).rejects.toThrow(ApiError);

    try {
      await apiRequest("/invalid");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe("VALIDATION_ERROR");
      expect(apiErr.message).toBe("Invalid medication dose");
      expect(apiErr.requestId).toBe("req-12345");
      expect(apiErr.details).toEqual([{ path: "dose", message: "Required" }]);
    }
  });

  it("maps non-JSON non-2xx responses to UNEXPECTED_RESPONSE or SERVER_UNAVAILABLE", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("HTML response");
      },
      headers: new Headers({ "x-request-id": "req-fail" }),
    });

    await expect(apiRequest("/crash")).rejects.toThrow(ApiError);

    try {
      await apiRequest("/crash");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("UNEXPECTED_RESPONSE");
      expect(apiErr.requestId).toBe("req-fail");
    }
  });

  it("maps 503 HTML gateway response to SERVER_UNAVAILABLE and retries GET", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => {
            throw new Error("HTML 503");
          },
          headers: new Headers(),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "recovered" }),
        headers: new Headers(),
      };
    });

    const result = await apiRequest<{ status: string }>("/flaky-service", { method: "GET" });
    expect(result).toEqual({ status: "recovered" });
    expect(callCount).toBe(2);
  });

  it("never retries mutating requests (POST) on 503", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("HTML 503");
        },
        headers: new Headers(),
      };
    });

    await expect(apiRequest("/submit", { method: "POST", body: { name: "test" } })).rejects.toThrow(
      ApiError,
    );

    expect(callCount).toBe(1);
  });

  it("handles offline state throwing OFFLINE ApiError without calling fetch", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await expect(apiRequest("/any-route")).rejects.toMatchObject({
      code: "OFFLINE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles AbortController timeout throwing TIMEOUT ApiError", async () => {
    global.fetch = vi.fn().mockImplementation(async (_url, opts) => {
      return new Promise((_, reject) => {
        opts.signal.addEventListener("abort", () => {
          const abortError = new DOMException("The user aborted a request.", "AbortError");
          reject(abortError);
        });
      });
    });

    await expect(apiRequest("/slow", { timeoutMs: 10 })).rejects.toMatchObject({
      code: "TIMEOUT",
      status: 408,
    });
  });

  describe("Single-Flight Refresh & CSRF Guard", () => {
    it("includes X-Saath-CSRF: 1 header on all requests", async () => {
      let capturedHeaders: Headers | undefined;
      global.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        capturedHeaders = new Headers(opts.headers);
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
          headers: new Headers(),
        };
      });

      await apiRequest("/ping");
      expect(capturedHeaders?.get("X-Saath-CSRF")).toBe("1");
    });

    it("triggers transparent single-flight refresh on 401 and retries original request", async () => {
      const calls: string[] = [];

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        calls.push(url);
        if (url === "/api/protected" && calls.filter((u) => u === "/api/protected").length === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: { code: "TOKEN_EXPIRED", message: "Access token expired" },
            }),
            headers: new Headers(),
          };
        }
        if (url === "/api/auth/refresh") {
          return {
            ok: true,
            status: 204,
            headers: new Headers(),
          };
        }
        if (url === "/api/protected") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ secret: "care-data" }),
            headers: new Headers(),
          };
        }
        throw new Error(`Unexpected url: ${url}`);
      });

      const res = await apiRequest<{ secret: string }>("/protected");
      expect(res).toEqual({ secret: "care-data" });
      expect(calls).toEqual(["/api/protected", "/api/auth/refresh", "/api/protected"]);
    });

    it("shares a single in-flight refresh promise across concurrent 401 requests", async () => {
      let refreshCalls = 0;
      let protectedCalls = 0;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/auth/refresh") {
          refreshCalls++;
          // Simulate latency in rotation
          await new Promise((r) => setTimeout(r, 50));
          return {
            ok: true,
            status: 204,
            headers: new Headers(),
          };
        }

        if (url.startsWith("/api/item")) {
          protectedCalls++;
          if (refreshCalls === 0) {
            return {
              ok: false,
              status: 401,
              json: async () => ({
                error: { code: "TOKEN_EXPIRED", message: "Expired" },
              }),
              headers: new Headers(),
            };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ item: url }),
            headers: new Headers(),
          };
        }

        throw new Error(`Unexpected: ${url}`);
      });

      const [res1, res2, res3] = await Promise.all([
        apiRequest<{ item: string }>("/item-1"),
        apiRequest<{ item: string }>("/item-2"),
        apiRequest<{ item: string }>("/item-3"),
      ]);

      expect(res1).toEqual({ item: "/api/item-1" });
      expect(res2).toEqual({ item: "/api/item-2" });
      expect(res3).toEqual({ item: "/api/item-3" });
      // Exactly 1 refresh call was made despite 3 simultaneous 401s
      expect(refreshCalls).toBe(1);
      // Each endpoint was called twice (initial 401 + retry after refresh)
      expect(protectedCalls).toBe(6);
    });

    it("redirects to /login and dispatches event when refresh fails with 401", async () => {
      let eventDispatched = false;
      const listener = (): void => {
        eventDispatched = true;
      };
      window.addEventListener("saath:auth-expired", listener);

      const locationSpy = { href: "http://localhost:3000/app", pathname: "/app" };
      const locationMock = vi
        .spyOn(window, "location", "get")
        .mockReturnValue(locationSpy as unknown as Location);

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/data") {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: { code: "TOKEN_EXPIRED", message: "Expired" },
            }),
            headers: new Headers(),
          };
        }
        if (url === "/api/auth/refresh") {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: { code: "REFRESH_REUSED", message: "Reused" },
            }),
            headers: new Headers(),
          };
        }
        throw new Error(`Unexpected: ${url}`);
      });

      await expect(apiRequest("/data")).rejects.toThrow(ApiError);
      expect(eventDispatched).toBe(true);
      expect(locationSpy.href).toBe("/login");

      window.removeEventListener("saath:auth-expired", listener);
      locationMock.mockRestore();
    });

    it("handles 409 REFRESH_RACE by waiting and retrying original request", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/race-data") {
          callCount++;
          if (callCount === 1) {
            return {
              ok: false,
              status: 401,
              json: async () => ({
                error: { code: "TOKEN_EXPIRED", message: "Expired" },
              }),
              headers: new Headers(),
            };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
            headers: new Headers(),
          };
        }
        if (url === "/api/auth/refresh") {
          return {
            ok: false,
            status: 409,
            json: async () => ({
              error: { code: "REFRESH_RACE", message: "Race occurred" },
            }),
            headers: new Headers(),
          };
        }
        throw new Error(`Unexpected: ${url}`);
      });

      const res = await apiRequest<{ success: boolean }>("/race-data");
      expect(res).toEqual({ success: true });
      expect(callCount).toBe(2);
    });

    it("never attempts refresh on auth loop routes like /auth/refresh or /auth/logout", async () => {
      let refreshAttempted = false;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/auth/refresh") {
          refreshAttempted = true;
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: { code: "REFRESH_INVALID", message: "Invalid" },
            }),
            headers: new Headers(),
          };
        }
        throw new Error(`Unexpected: ${url}`);
      });

      await expect(apiRequest("/auth/refresh", { method: "POST" })).rejects.toThrow(ApiError);
      expect(refreshAttempted).toBe(true);
      // Ensure it didn't call itself a second time in an infinite recursion
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
