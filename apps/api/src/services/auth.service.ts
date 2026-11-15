import type { Profile } from "passport-google-oauth20";
import { z } from "zod";
import { AccountDisabledError, OAuthFailedError } from "../errors/http-errors.js";
import type { UserDocument } from "../models/user.model.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { userRepository } from "../repositories/user.repository.js";

const googleProfileSchema = z.object({
  id: z.string().min(1, "Google ID is required"),
  displayName: z.string().default("User"),
  emails: z
    .array(
      z.object({
        value: z.string().email(),
        verified: z.boolean().optional(),
      }),
    )
    .optional(),
  photos: z.array(z.object({ value: z.string() })).optional(),
  _json: z.object({
    email_verified: z.boolean().optional(),
    email: z.string().email().optional(),
    picture: z.string().optional(),
    name: z.string().optional(),
  }),
});

/**
 * Sanitises the `returnTo` redirect parameter.
 * Strictly permits only relative paths starting with a single '/' not followed by '/' or '\',
 * with no URI scheme, control characters, or invalid path segments.
 * Defaults safely to '/app'.
 */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return "/app";
  }

  // Must start with exactly one '/' and not be followed by '/' or '\'
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/app";
  }

  // Strictly match allowed URL path and query characters without schemes or control chars
  const validPathRegex = /^\/[A-Za-z0-9\-._~/?=&%#]*$/;
  if (!validPathRegex.test(value)) {
    return "/app";
  }

  return value;
}

/**
 * Validates a Google OAuth profile, ensures email verification,
 * and upserts the user in the database by googleId.
 */
export async function verifyGoogleProfile(
  profile: Profile | unknown,
  requestId?: string,
): Promise<UserDocument> {
  const parsed = googleProfileSchema.safeParse(profile);
  if (!parsed.success) {
    throw new OAuthFailedError("Invalid Google profile payload");
  }

  const { id: googleId, _json } = parsed.data;
  const isEmailVerified = _json.email_verified === true;
  const email = _json.email?.toLowerCase();

  if (!isEmailVerified || !email) {
    throw new OAuthFailedError("Google account email is not verified");
  }

  const name = _json.name ?? parsed.data.displayName ?? "User";
  const avatarUrl = _json.picture ?? parsed.data.photos?.[0]?.value;

  const user = await userRepository.upsertGoogleUser({
    googleId,
    email,
    name,
    avatarUrl,
  });

  if (user.status === "disabled") {
    await auditEventRepository.create({
      actorUserId: user.id,
      action: "auth.login",
      outcome: "failure",
      metadata: { reason: "account_disabled", googleId },
      requestId,
    });
    throw new AccountDisabledError("This account is disabled. Please contact support.");
  }

  await auditEventRepository.create({
    actorUserId: user.id,
    action: "auth.login",
    outcome: "success",
    metadata: { provider: "google" },
    requestId,
  });

  return user;
}
