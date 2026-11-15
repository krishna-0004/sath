import { describe, expect, it } from "vitest";
import { getWebEnv } from "./env.js";

describe("Web Environment Validator", () => {
  it("provides validated default web env object", () => {
    const webEnv = getWebEnv();
    expect(webEnv).toBeDefined();
    expect(typeof webEnv.MODE).toBe("string");
    expect(typeof webEnv.BASE_URL).toBe("string");
  });
});
