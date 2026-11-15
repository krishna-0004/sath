import type { Profile } from "passport-google-oauth20";
import { z } from "zod";
import { OAuthFailedError } from "../errors/http-errors.js";

export interface AuthenticatedUser {
  id: string;
  googleId?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isDemo: boolean;
  status: "active" | "disabled";
}

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
 * Validates a Google OAuth profile and upserts the corresponding user record.
 * Throws OAuthFailedError if the email is unverified or missing.
 */
export async function verifyGoogleProfile(profile: Profile | unknown): Promise<AuthenticatedUser> {
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

  // Implementation will be connected to UserRepository in Step 2 / Step 5
  return {
    id: googleId,
    googleId,
    email,
    name: _json.name ?? parsed.data.displayName ?? "User",
    avatarUrl: _json.picture ?? parsed.data.photos?.[0]?.value,
    isDemo: false,
    status: "active",
  };
}
