import passport from "passport";
import { describe, expect, it, vi } from "vitest";
import { configurePassport } from "../src/config/passport.js";
import {
  AccountDisabledError,
  CsrfRejectedError,
  OAuthFailedError,
  OAuthStateMismatchError,
  RefreshInvalidError,
  RefreshRaceError,
  RefreshReusedError,
  TokenExpiredError,
} from "../src/errors/http-errors.js";
import { verifyGoogleProfile } from "../src/services/auth.service.js";

describe("Passport Strategy Configuration", () => {
  it("registers Google OAuth strategy in passport", () => {
    const useSpy = vi.spyOn(passport, "use");
    configurePassport();
    expect(useSpy).toHaveBeenCalled();
  });
});

describe("Phase 1 Authentication HTTP Errors", () => {
  it("instantiates new auth-specific error classes with correct codes and status", () => {
    const tokenExpired = new TokenExpiredError();
    expect(tokenExpired.code).toBe("TOKEN_EXPIRED");
    expect(tokenExpired.status).toBe(401);

    const refreshInvalid = new RefreshInvalidError();
    expect(refreshInvalid.code).toBe("REFRESH_INVALID");
    expect(refreshInvalid.status).toBe(401);

    const refreshReused = new RefreshReusedError();
    expect(refreshReused.code).toBe("REFRESH_REUSED");
    expect(refreshReused.status).toBe(401);

    const refreshRace = new RefreshRaceError();
    expect(refreshRace.code).toBe("REFRESH_RACE");
    expect(refreshRace.status).toBe(409);

    const csrf = new CsrfRejectedError();
    expect(csrf.code).toBe("CSRF_REJECTED");
    expect(csrf.status).toBe(403);

    const oauthFailed = new OAuthFailedError();
    expect(oauthFailed.code).toBe("OAUTH_FAILED");
    expect(oauthFailed.status).toBe(400);

    const oauthMismatch = new OAuthStateMismatchError();
    expect(oauthMismatch.code).toBe("OAUTH_STATE_MISMATCH");
    expect(oauthMismatch.status).toBe(400);

    const accountDisabled = new AccountDisabledError();
    expect(accountDisabled.code).toBe("ACCOUNT_DISABLED");
    expect(accountDisabled.status).toBe(403);
  });
});

describe("Google Profile Verification Stub", () => {
  it("verifies and extracts user details from valid verified Google profile", async () => {
    const validProfile = {
      id: "google-123456",
      displayName: "Elder User",
      _json: {
        email_verified: true,
        email: "user@example.com",
        name: "Elder User",
        picture: "https://example.com/avatar.png",
      },
    };

    const user = await verifyGoogleProfile(validProfile);
    expect(user.googleId).toBe("google-123456");
    expect(user.email).toBe("user@example.com");
    expect(user.name).toBe("Elder User");
  });

  it("throws OAuthFailedError when email is not verified", async () => {
    const unverifiedProfile = {
      id: "google-123456",
      displayName: "Unverified User",
      _json: {
        email_verified: false,
        email: "unverified@example.com",
      },
    };

    await expect(verifyGoogleProfile(unverifiedProfile)).rejects.toThrow(OAuthFailedError);
  });
});
