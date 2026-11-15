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
});
