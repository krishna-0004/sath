import { describe, expect, it } from "vitest";
import { withTimeout } from "../src/utils/async-timeout.js";
import { timingSafeEqual } from "../src/utils/safe-compare.js";

describe("Utility Functions", () => {
  describe("timingSafeEqual", () => {
    it("returns true for matching strings", () => {
      expect(timingSafeEqual("my-secret-key-12345", "my-secret-key-12345")).toBe(true);
    });

    it("returns false for different strings of equal length", () => {
      expect(timingSafeEqual("my-secret-key-12345", "my-secret-key-12349")).toBe(false);
    });

    it("returns false for different strings of unequal length", () => {
      expect(timingSafeEqual("short", "much-longer-string")).toBe(false);
    });
  });

  describe("withTimeout", () => {
    it("resolves when promise settles before timeout", async () => {
      const fastPromise = Promise.resolve("success");
      const result = await withTimeout(fastPromise, 500);
      expect(result).toBe("success");
    });

    it("rejects when operation exceeds timeout threshold", async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 500));
      await expect(withTimeout(slowPromise, 50, "Timed out")).rejects.toThrow("Timed out");
    });
  });
});
