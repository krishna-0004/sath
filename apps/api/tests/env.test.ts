import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config/env.js";

describe("Environment Configuration Validator", () => {
  const baseValidConfig = {
    NODE_ENV: "production",
    PORT: "5000",
    LOG_LEVEL: "debug",
    MONGODB_URI: "mongodb://localhost:27017/saath_test",
    CLIENT_ORIGIN: "https://saath-web.netlify.app",
    AI_SERVICE_URL: "https://saath-ai.onrender.com",
    AI_SERVICE_TOKEN: "valid-secure-service-token-with-at-least-32-chars",
    GOOGLE_CLIENT_ID: "google-client-id-123.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "google-client-secret-xyz",
    GOOGLE_CALLBACK_URL: "https://saath-api.onrender.com/api/auth/google/callback",
    JWT_ACCESS_SECRET: "jwt-secret-at-least-32-characters-long-unique",
    COOKIE_SECRET: "cookie-secret-at-least-32-characters-long-different",
  };

  it("successfully parses valid environment variables", () => {
    const parsed = validateEnv(baseValidConfig);
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(5000);
    expect(parsed.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(parsed.REFRESH_TOKEN_TTL_DAYS).toBe(7);
    expect(parsed.REFRESH_REUSE_LEEWAY_SECONDS).toBe(10);
    expect(parsed.DEMO_LOGIN_ENABLED).toBe(false);
  });

  it("fails with a readable list of errors when secrets and required fields are missing", () => {
    const invalidConfig = {
      PORT: "not-a-number",
      AI_SERVICE_TOKEN: "short",
    };

    expect(() => validateEnv(invalidConfig)).toThrowError(
      /Environment validation failed with \d+ error\(s\)/,
    );

    try {
      validateEnv(invalidConfig);
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain("MONGODB_URI: MONGODB_URI is required");
      expect(message).toContain("CLIENT_ORIGIN: CLIENT_ORIGIN is required");
      expect(message).toContain("AI_SERVICE_URL: AI_SERVICE_URL is required");
      expect(message).toContain("GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID is required");
      expect(message).toContain("GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET is required");
      expect(message).toContain("GOOGLE_CALLBACK_URL: GOOGLE_CALLBACK_URL is required");
      expect(message).toContain("JWT_ACCESS_SECRET: JWT_ACCESS_SECRET is required");
      expect(message).toContain("COOKIE_SECRET: COOKIE_SECRET is required");
    }
  });

  it("fails validation when COOKIE_SECRET equals JWT_ACCESS_SECRET", () => {
    const duplicateSecretConfig = {
      ...baseValidConfig,
      JWT_ACCESS_SECRET: "identical-secret-key-that-is-at-least-32-chars-long",
      COOKIE_SECRET: "identical-secret-key-that-is-at-least-32-chars-long",
    };

    expect(() => validateEnv(duplicateSecretConfig)).toThrowError(
      /COOKIE_SECRET must not equal JWT_ACCESS_SECRET/,
    );
  });
});
