import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.js";

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "saath_at",
  REFRESH_TOKEN: "saath_rt",
  OAUTH_STATE: "saath_oauth",
} as const;

export interface AuthCookiesPayload {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthStatePayload {
  state: string;
  returnTo: string;
}

const isProduction = env.NODE_ENV === "production";

/**
 * Single source of truth for all cookie configurations across the platform.
 */
export const cookieConfig = {
  accessToken: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  } satisfies CookieOptions,
  refreshToken: {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProduction,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  } satisfies CookieOptions,
  oauthState: {
    signed: true,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/api/auth/google",
    maxAge: 10 * 60 * 1000, // 10 minutes
  } satisfies CookieOptions,
};

/**
 * Sets host-only httpOnly cookies for access and refresh tokens.
 */
export function setAuthCookies(res: Response, tokens: AuthCookiesPayload): void {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, cookieConfig.accessToken);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, cookieConfig.refreshToken);
}

/**
 * Clears host-only authentication cookies using identical path and security flags.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    httpOnly: cookieConfig.accessToken.httpOnly,
    sameSite: cookieConfig.accessToken.sameSite,
    secure: cookieConfig.accessToken.secure,
    path: cookieConfig.accessToken.path,
  });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    httpOnly: cookieConfig.refreshToken.httpOnly,
    sameSite: cookieConfig.refreshToken.sameSite,
    secure: cookieConfig.refreshToken.secure,
    path: cookieConfig.refreshToken.path,
  });
}

/**
 * Sets a signed, short-lived cookie containing OAuth state and sanitised returnTo.
 */
export function setOAuthStateCookie(res: Response, payload: OAuthStatePayload): void {
  res.cookie(COOKIE_NAMES.OAUTH_STATE, JSON.stringify(payload), cookieConfig.oauthState);
}

/**
 * Reads and verifies the signed OAuth state cookie.
 */
export function readOAuthStateCookie(req: Request): OAuthStatePayload | null {
  const raw = req.signedCookies?.[COOKIE_NAMES.OAUTH_STATE];
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed &&
      typeof (parsed as { state: unknown }).state === "string"
    ) {
      return {
        state: (parsed as { state: string }).state,
        returnTo: (parsed as { returnTo?: string }).returnTo || "/app",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears the OAuth state cookie upon callback completion.
 */
export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(COOKIE_NAMES.OAUTH_STATE, {
    signed: cookieConfig.oauthState.signed,
    httpOnly: cookieConfig.oauthState.httpOnly,
    sameSite: cookieConfig.oauthState.sameSite,
    secure: cookieConfig.oauthState.secure,
    path: cookieConfig.oauthState.path,
  });
}
