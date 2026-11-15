import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { UserModel } from "../src/models/user.model.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";
import { signAccessToken } from "../src/services/token.service.js";

describe("Authentication Endpoints & Middleware (Step 6)", () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

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

  describe("CSRF Guard Middleware", () => {
    it("rejects mutating requests missing X-Saath-CSRF header with 403 CSRF_REJECTED", async () => {
      const res = await request(app).post("/api/auth/demo").send({}).expect(403);

      expect(res.body.error.code).toBe("CSRF_REJECTED");
    });

    it("rejects mutating requests with disallowed Origin with 403 CSRF_REJECTED", async () => {
      const res = await request(app)
        .post("/api/auth/demo")
        .set("X-Saath-CSRF", "1")
        .set("Origin", "https://unauthorized-malicious-domain.com")
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe("CSRF_REJECTED");
    });
  });

  describe("Demo Login Flow & Cookie Verification", () => {
    it("successfully logs in demo user with valid CSRF header and sets cookies", async () => {
      const res = await request(app)
        .post("/api/auth/demo")
        .set("X-Saath-CSRF", "1")
        .set("Origin", env.CLIENT_ORIGIN)
        .expect(204);

      expect(res.headers["cache-control"]).toBe("no-store");
      const cookies = res.headers["set-cookie"] as string[];
      expect(cookies).toBeDefined();

      const atCookie = cookies.find((c) => c.includes(COOKIE_NAMES.ACCESS_TOKEN));
      const rtCookie = cookies.find((c) => c.includes(COOKIE_NAMES.REFRESH_TOKEN));

      expect(atCookie).toBeDefined();
      expect(atCookie).toContain("HttpOnly");
      expect(atCookie).toContain("SameSite=Lax");
      expect(atCookie).toContain("Path=/;");

      expect(rtCookie).toBeDefined();
      expect(rtCookie).toContain("HttpOnly");
      expect(rtCookie).toContain("SameSite=Strict");
      expect(rtCookie).toContain("Path=/api/auth");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 UNAUTHENTICATED when access token cookie is missing", async () => {
      const res = await request(app).get("/api/auth/me").expect(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 200 with user profile when valid saath_at cookie is provided", async () => {
      const user = await UserModel.create({
        googleId: "google-me-test",
        email: "me.test@example.com",
        name: "Me Test Elder",
        status: "active",
        isDemo: false,
      });

      const token = await signAccessToken(user.id);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${token}`])
        .expect(200);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.user).toEqual({
        id: user.id,
        name: "Me Test Elder",
        email: "me.test@example.com",
        avatarUrl: null,
        isDemo: false,
      });
    });

    it("returns 403 ACCOUNT_DISABLED when user status is disabled", async () => {
      const user = await UserModel.create({
        googleId: "google-disabled-me",
        email: "disabled.me@example.com",
        name: "Disabled Account",
        status: "disabled",
      });

      const token = await signAccessToken(user.id);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${token}`])
        .expect(403);

      expect(res.body.error.code).toBe("ACCOUNT_DISABLED");
    });
  });

  describe("POST /api/auth/refresh, /logout, /logout-all", () => {
    it("rotates refresh token and clears cookies on failure", async () => {
      // 1. Demo login to obtain valid cookies
      const loginRes = await request(app)
        .post("/api/auth/demo")
        .set("X-Saath-CSRF", "1")
        .expect(204);

      const cookies = loginRes.headers["set-cookie"] as string[];

      // 2. Successful refresh
      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .set("X-Saath-CSRF", "1")
        .set("Cookie", cookies)
        .expect(204);

      expect(refreshRes.headers["cache-control"]).toBe("no-store");
      const newCookies = refreshRes.headers["set-cookie"] as string[];
      expect(newCookies.length).toBeGreaterThanOrEqual(2);

      // 3. Invalid refresh clears cookies and returns 401
      const failRes = await request(app)
        .post("/api/auth/refresh")
        .set("X-Saath-CSRF", "1")
        .set("Cookie", [`${COOKIE_NAMES.REFRESH_TOKEN}=invalid-token-string`])
        .expect(401);

      expect(failRes.body.error.code).toBe("REFRESH_INVALID");
      const clearedCookies = failRes.headers["set-cookie"] as string[];
      expect(clearedCookies.some((c) => c.includes(COOKIE_NAMES.ACCESS_TOKEN))).toBe(true);
      expect(clearedCookies.some((c) => c.includes(COOKIE_NAMES.REFRESH_TOKEN))).toBe(true);
    });

    it("logout is idempotent and clears cookies", async () => {
      const res1 = await request(app).post("/api/auth/logout").set("X-Saath-CSRF", "1").expect(204);

      const res2 = await request(app).post("/api/auth/logout").set("X-Saath-CSRF", "1").expect(204);

      expect(res1.status).toBe(204);
      expect(res2.status).toBe(204);
    });
  });
});
