import { describe, expect, it } from "vitest";
import { ApiError, getErrorMessage, isApiError } from "./api-error.js";

describe("API Error Utilities", () => {
  it("identifies ApiError instances with isApiError guard", () => {
    const apiErr = new ApiError(400, "VALIDATION_ERROR", "Invalid input");
    const stdErr = new Error("Standard error");

    expect(isApiError(apiErr)).toBe(true);
    expect(isApiError(stdErr)).toBe(false);
    expect(isApiError("string error")).toBe(false);
  });

  it("maps error codes to user-friendly messages without technical jargon", () => {
    expect(getErrorMessage(new ApiError(0, "OFFLINE", ""))).toContain("offline");
    expect(getErrorMessage(new ApiError(408, "TIMEOUT", ""))).toContain("longer than expected");
    expect(getErrorMessage(new ApiError(401, "UNAUTHENTICATED", ""))).toContain(
      "session has ended",
    );
    expect(getErrorMessage(new ApiError(403, "FORBIDDEN", ""))).toContain("permission");
    expect(getErrorMessage(new ApiError(404, "NOT_FOUND", ""))).toContain("could not be found");
    expect(getErrorMessage(new ApiError(429, "RATE_LIMITED", ""))).toContain("rest for a moment");
    expect(getErrorMessage(new ApiError(503, "SERVER_UNAVAILABLE", ""))).toContain("wakes up");
    expect(getErrorMessage(new Error("Plain JS error"))).toBe("Plain JS error");
  });
});
