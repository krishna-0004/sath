import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { AccountDisabledError, OAuthFailedError } from "../src/errors/http-errors.js";
import { UserModel, type UserDocument } from "../src/models/user.model.js";
import { sanitizeReturnTo, verifyGoogleProfile } from "../src/services/auth.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Google OAuth Unit Tests (src/services/auth.service.ts)", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("sanitizeReturnTo", () => {
    it("safely resolves redirect paths against malicious attacks", () => {
      // Attacks resolving to /app
      expect(sanitizeReturnTo("//evil.com")).toBe("/app");
      expect(sanitizeReturnTo("https://evil.com")).toBe("/app");
      expect(sanitizeReturnTo("/\\evil.com")).toBe("/app");
      expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/app");
      expect(sanitizeReturnTo("")).toBe("/app");
      expect(sanitizeReturnTo(null)).toBe("/app");
      expect(sanitizeReturnTo(undefined)).toBe("/app");

      // Valid paths allowed
      expect(sanitizeReturnTo("/app?x=1")).toBe("/app?x=1");
      expect(sanitizeReturnTo("/")).toBe("/");
      expect(sanitizeReturnTo("/profile/settings")).toBe("/profile/settings");
    });
  });

  describe("verifyGoogleProfile", () => {
    it("rejects unverified email with OAuthFailedError", async () => {
      const unverified = {
        id: "g-unverified",
        displayName: "No Verified Email",
        _json: {
          email_verified: false,
          email: "unverified@example.com",
        },
      };

      await expect(verifyGoogleProfile(unverified)).rejects.toThrow(OAuthFailedError);
    });

    it("upserts user idempotently by googleId", async () => {
      const profile = {
        id: "g-verified-123",
        displayName: "Elder User",
        _json: {
          email_verified: true,
          email: "elder.google@example.com",
          name: "Elder Google",
          picture: "https://example.com/pic.png",
        },
      };

      const user1 = await verifyGoogleProfile(profile);
      expect(user1.id).toBeDefined();
      expect(user1.googleId).toBe("g-verified-123");
      expect(user1.email).toBe("elder.google@example.com");

      // Second verify updates lastLoginAt but preserves id
      const user2 = await verifyGoogleProfile(profile);
      expect(user2.id).toBe(user1.id);
    });

    it("rejects disabled users with AccountDisabledError", async () => {
      const disabledProfile = {
        id: "g-disabled-user",
        displayName: "Disabled Elder",
        _json: {
          email_verified: true,
          email: "disabled.elder@example.com",
        },
      };

      const user = await verifyGoogleProfile(disabledProfile);
      await UserModel.findByIdAndUpdate(user.id, { $set: { status: "disabled" } });

      await expect(verifyGoogleProfile(disabledProfile)).rejects.toThrow(AccountDisabledError);
    });
  });
});

describe("Google OAuth Route Tests with Injected Stub", () => {
  let mongoServer: MongoMemoryServer;
  let testUser: UserDocument;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    testUser = await UserModel.create({
      googleId: "google-route-test-sub",
      email: "route-test@example.com",
      name: "Route Test User",
      status: "active",
      isDemo: false,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("redirects to state_mismatch when state cookie is missing", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/auth/google/callback?state=some-state&code=fake-code")
      .expect(302);

    expect(res.headers["location"]).toBe(`${env.CLIENT_ORIGIN}/login?error=state_mismatch`);
  });

  it("redirects to state_mismatch when state does not match cookie", async () => {
    const app = createApp();

    // Initiate google auth to receive the signed state cookie
    const initRes = await request(app).get("/api/auth/google").expect(302);
    const cookies = initRes.headers["set-cookie"];

    // Provide wrong state in query
    const callbackRes = await request(app)
      .get("/api/auth/google/callback?state=wrong-mismatched-state&code=fake-code")
      .set("Cookie", cookies)
      .expect(302);

    expect(callbackRes.headers["location"]).toBe(`${env.CLIENT_ORIGIN}/login?error=state_mismatch`);
  });

  it("handles access_denied query error gracefully", async () => {
    const app = createApp({
      googleCallbackAuth: (_req, _res, callback) => {
        void callback(new Error("access_denied"), false);
      },
    });

    const initRes = await request(app).get("/api/auth/google").expect(302);
    const cookies = initRes.headers["set-cookie"];
    const location = initRes.headers["location"] as string;
    const url = new URL(location);
    const state = url.searchParams.get("state") || "";

    const callbackRes = await request(app)
      .get(`/api/auth/google/callback?state=${state}&error=access_denied`)
      .set("Cookie", cookies)
      .expect(302);

    expect(callbackRes.headers["location"]).toBe(`${env.CLIENT_ORIGIN}/login?error=access_denied`);
  });

  it("redirects to /app with auth cookies set and oauth cookie cleared on successful auth", async () => {
    const app = createApp({
      googleCallbackAuth: (_req, _res, callback) => {
        // Injected stub simulating successful Google verification
        void callback(null, testUser);
      },
    });

    // 1. Initiate OAuth flow
    const initRes = await request(app).get("/api/auth/google?returnTo=/app/profile").expect(302);

    const cookies = initRes.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();

    const location = initRes.headers["location"] as string;
    expect(location).toContain("accounts.google.com");
    const url = new URL(location);
    const state = url.searchParams.get("state") || "";
    expect(state).not.toBe("");

    // 2. Simulate callback with matching state
    const callbackRes = await request(app)
      .get(`/api/auth/google/callback?state=${state}&code=valid-test-code`)
      .set("Cookie", cookies)
      .expect(302);

    // Assert destination is the sanitized returnTo relative to CLIENT_ORIGIN
    expect(callbackRes.headers["location"]).toBe(`${env.CLIENT_ORIGIN}/app/profile`);

    const callbackCookies = callbackRes.headers["set-cookie"] as string[];
    expect(callbackCookies).toBeDefined();

    const hasAccessToken = callbackCookies.some((c) => c.includes(COOKIE_NAMES.ACCESS_TOKEN));
    const hasRefreshToken = callbackCookies.some((c) => c.includes(COOKIE_NAMES.REFRESH_TOKEN));
    const clearsOAuthCookie = callbackCookies.some(
      (c) =>
        c.includes(COOKIE_NAMES.OAUTH_STATE) && (c.includes("Expires=") || c.includes("Max-Age=0")),
    );

    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);
    expect(clearsOAuthCookie).toBe(true);
  });
});
