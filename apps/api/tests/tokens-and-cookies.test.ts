import * as jose from "jose";
import { describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { TokenExpiredError, UnauthenticatedError } from "../src/errors/http-errors.js";
import {
  COOKIE_NAMES,
  clearAuthCookies,
  clearOAuthStateCookie,
  cookieConfig,
  readOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
} from "../src/services/cookie.service.js";
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "../src/services/token.service.js";

describe("Token Service (src/services/token.service.ts)", () => {
  const secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

  it("successfully signs and verifies an access token", async () => {
    const userId = "user-123456";
    const token = await signAccessToken(userId);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifyAccessToken(token);
    expect(decoded.userId).toBe(userId);
    expect(decoded.jti).toBeDefined();
    expect(decoded.jti.length).toBeGreaterThan(10);
  });

  it("throws TokenExpiredError when token is expired", async () => {
    const expiredToken = await new jose.SignJWT({
      sub: "user-123456",
      jti: "token-uuid-123",
      typ: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setIssuer("saath")
      .setAudience("saath-web")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 100)
      .sign(secretKey);

    await expect(verifyAccessToken(expiredToken)).rejects.toThrow(TokenExpiredError);
  });

  it("throws UnauthenticatedError on tampered signature", async () => {
    const validToken = await signAccessToken("user-123");
    const tampered = validToken.slice(0, -5) + "abcde";

    await expect(verifyAccessToken(tampered)).rejects.toThrow(UnauthenticatedError);
  });

  it("throws UnauthenticatedError on wrong audience", async () => {
    const wrongAudienceToken = await new jose.SignJWT({
      sub: "user-123",
      jti: "token-1",
      typ: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("saath")
      .setAudience("wrong-audience")
      .setExpirationTime("15m")
      .sign(secretKey);

    await expect(verifyAccessToken(wrongAudienceToken)).rejects.toThrow(UnauthenticatedError);
  });

  it("throws UnauthenticatedError on wrong issuer", async () => {
    const wrongIssuerToken = await new jose.SignJWT({
      sub: "user-123",
      jti: "token-1",
      typ: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("wrong-issuer")
      .setAudience("saath-web")
      .setExpirationTime("15m")
      .sign(secretKey);

    await expect(verifyAccessToken(wrongIssuerToken)).rejects.toThrow(UnauthenticatedError);
  });

  it("rejects an alg:none unsecured token with UnauthenticatedError", async () => {
    // Manually construct an alg:none token
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "user-123",
        jti: "token-none",
        typ: "access",
        iss: "saath",
        aud: "saath-web",
      }),
    ).toString("base64url");
    const noneToken = `${header}.${payload}.`;

    await expect(verifyAccessToken(noneToken)).rejects.toThrow(UnauthenticatedError);
  });

  it("never includes the raw token in thrown error message", async () => {
    const badToken = "completely.invalid.secret-token-value-xyz";
    try {
      await verifyAccessToken(badToken);
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(UnauthenticatedError);
      expect((err as Error).message).not.toContain(badToken);
    }
  });

  it("generates 32-byte base64url refresh tokens and computes SHA-256 hash", () => {
    const { raw, hash } = generateRefreshToken();
    expect(raw).toBeDefined();
    expect(raw.length).toBeGreaterThanOrEqual(40); // 32 bytes base64url = ~43 chars
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex is 64 chars

    expect(hashToken(raw)).toBe(hash);
  });
});

describe("Cookie Service (src/services/cookie.service.ts)", () => {
  it("verifies cookieConfig follows strict security decisions", () => {
    // Access token cookie
    expect(cookieConfig.accessToken.httpOnly).toBe(true);
    expect(cookieConfig.accessToken.sameSite).toBe("lax");
    expect(cookieConfig.accessToken.path).toBe("/");
    expect(cookieConfig.accessToken.maxAge).toBe(900 * 1000);
    expect(cookieConfig.accessToken.secure).toBe(false); // in test environment

    // Refresh token cookie
    expect(cookieConfig.refreshToken.httpOnly).toBe(true);
    expect(cookieConfig.refreshToken.sameSite).toBe("strict");
    expect(cookieConfig.refreshToken.path).toBe("/api/auth");
    expect(cookieConfig.refreshToken.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    expect(cookieConfig.refreshToken.secure).toBe(false); // in test environment

    // OAuth state cookie
    expect(cookieConfig.oauthState.signed).toBe(true);
    expect(cookieConfig.oauthState.httpOnly).toBe(true);
    expect(cookieConfig.oauthState.sameSite).toBe("lax");
    expect(cookieConfig.oauthState.path).toBe("/api/auth/google");
    expect(cookieConfig.oauthState.maxAge).toBe(10 * 60 * 1000);
  });

  it("sets and clears auth cookies with identical paths and flags", () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Parameters<typeof setAuthCookies>[0];

    setAuthCookies(res, {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
    });

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      "access-token-123",
      cookieConfig.accessToken,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      "refresh-token-456",
      cookieConfig.refreshToken,
    );

    clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      expect.objectContaining({ path: "/" }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({ path: "/api/auth" }),
    );
  });

  it("handles OAuth state cookie setting, reading, and clearing", () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Parameters<typeof setOAuthStateCookie>[0];

    setOAuthStateCookie(res, {
      state: "random-state-123",
      returnTo: "/app/dashboard",
    });

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.OAUTH_STATE,
      JSON.stringify({ state: "random-state-123", returnTo: "/app/dashboard" }),
      cookieConfig.oauthState,
    );

    const validReq = {
      signedCookies: {
        [COOKIE_NAMES.OAUTH_STATE]: JSON.stringify({
          state: "random-state-123",
          returnTo: "/app/dashboard",
        }),
      },
    } as unknown as Parameters<typeof readOAuthStateCookie>[0];

    const read = readOAuthStateCookie(validReq);
    expect(read).toEqual({
      state: "random-state-123",
      returnTo: "/app/dashboard",
    });

    // Invalid cookie reads return null
    const invalidReq = {
      signedCookies: { [COOKIE_NAMES.OAUTH_STATE]: "not-valid-json" },
    } as unknown as Parameters<typeof readOAuthStateCookie>[0];
    expect(readOAuthStateCookie(invalidReq)).toBeNull();

    clearOAuthStateCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.OAUTH_STATE,
      expect.objectContaining({ path: "/api/auth/google" }),
    );
  });
});
