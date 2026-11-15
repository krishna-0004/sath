import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config/env.js";

describe("Environment Configuration Validator", () => {
  it("successfully parses valid environment variables", () => {
    const validConfig = {
      NODE_ENV: "production",
      PORT: "5000",
      LOG_LEVEL: "debug",
      MONGODB_URI: "mongodb://localhost:27017/saath_test",
      CLIENT_ORIGIN: "https://saath-web.netlify.app",
      AI_SERVICE_URL: "https://saath-ai.onrender.com",
      AI_SERVICE_TOKEN: "valid-secure-service-token-with-at-least-32-chars",
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(5000);
    expect(parsed.AI_SERVICE_URL).toBe("https://saath-ai.onrender.com");
  });

  it("throws a descriptive error when required variables are missing", () => {
    const invalidConfig = {
      PORT: "not-a-number",
      AI_SERVICE_TOKEN: "short",
    };

    expect(() => validateEnv(invalidConfig)).toThrow(
      /Environment validation failed with \d+ error\(s\)/,
    );
  });
});
