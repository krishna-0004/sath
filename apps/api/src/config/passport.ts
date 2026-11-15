import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import { verifyGoogleProfile } from "../services/auth.service.js";
import { env } from "./env.js";

/**
 * Configures Passport with the Google OAuth 2.0 strategy.
 * The verify callback delegates completely to auth.service without local business logic.
 */
export function configurePassport(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ["openid", "email", "profile"],
      },
      (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        verifyGoogleProfile(profile)
          .then((user) => done(null, user))
          .catch((err: unknown) => done(err as Error, undefined));
      },
    ),
  );
}
