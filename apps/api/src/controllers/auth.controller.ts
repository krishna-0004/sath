import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { env } from "../config/env.js";
import {
  AccountDisabledError,
  NotFoundError,
  UnauthenticatedError,
} from "../errors/http-errors.js";
import type { UserDocument } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { sanitizeReturnTo } from "../services/auth.service.js";
import {
  COOKIE_NAMES,
  clearAuthCookies,
  clearOAuthStateCookie,
  readOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
} from "../services/cookie.service.js";
import { logout, logoutAll, rotate, startSession } from "../services/session.service.js";
import { timingSafeEqual } from "../utils/safe-compare.js";

export type GoogleAuthenticatorFn = (req: Request, res: Response, next: NextFunction) => void;

export type GoogleCallbackAuthenticatorFn = (
  req: Request,
  res: Response,
  customCallback: (
    err: unknown,
    user: UserDocument | false,
    info?: unknown,
  ) => Promise<void> | void,
) => void;

export interface AuthControllerDependencies {
  googleAuth?: GoogleAuthenticatorFn;
  googleCallbackAuth?: GoogleCallbackAuthenticatorFn;
}

export interface AuthController {
  initiateGoogleAuth: (req: Request, res: Response, next: NextFunction) => void;
  handleGoogleCallback: (req: Request, res: Response) => void;
  getMe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  logoutSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  logoutAllSessions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  demoLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export function createAuthController(deps: AuthControllerDependencies = {}): AuthController {
  const defaultGoogleAuth: GoogleAuthenticatorFn = (req, res, next) => {
    const state = (req as Request & { oauthState?: string }).oauthState;
    passport.authenticate("google", {
      session: false,
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    })(req, res, next);
  };

  const defaultGoogleCallbackAuth: GoogleCallbackAuthenticatorFn = (req, res, customCallback) => {
    passport.authenticate(
      "google",
      { session: false, failWithError: false },
      (err: unknown, user: UserDocument | false, info: unknown) => {
        void customCallback(err, user, info);
      },
    )(req, res);
  };

  const googleAuth = deps.googleAuth ?? defaultGoogleAuth;
  const googleCallbackAuth = deps.googleCallbackAuth ?? defaultGoogleCallbackAuth;

  return {
    initiateGoogleAuth(req: Request, res: Response, next: NextFunction): void {
      const state = crypto.randomBytes(32).toString("base64url");
      const returnTo = sanitizeReturnTo(req.query["returnTo"]);

      setOAuthStateCookie(res, { state, returnTo });
      (req as Request & { oauthState?: string }).oauthState = state;

      googleAuth(req, res, next);
    },

    handleGoogleCallback(req: Request, res: Response): void {
      const oauthCookie = readOAuthStateCookie(req);
      clearOAuthStateCookie(res);

      const queryState = typeof req.query["state"] === "string" ? req.query["state"] : "";

      if (!oauthCookie || !oauthCookie.state || !timingSafeEqual(oauthCookie.state, queryState)) {
        res.redirect(`${env.CLIENT_ORIGIN}/login?error=state_mismatch`);
        return;
      }

      googleCallbackAuth(req, res, async (err: unknown, user: UserDocument | false) => {
        if (err instanceof AccountDisabledError) {
          res.redirect(`${env.CLIENT_ORIGIN}/login?error=account_disabled`);
          return;
        }

        if (req.query["error"] === "access_denied") {
          res.redirect(`${env.CLIENT_ORIGIN}/login?error=access_denied`);
          return;
        }

        if (err || !user) {
          res.redirect(`${env.CLIENT_ORIGIN}/login?error=oauth_failed`);
          return;
        }

        const requestId = req.requestId;
        const session = await startSession(user.id, requestId, "auth.login");
        setAuthCookies(res, session);

        const returnTo = oauthCookie.returnTo || "/app";
        res.redirect(`${env.CLIENT_ORIGIN}${returnTo}`);
      });
    },

    async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = req.auth?.userId;
        if (!userId) {
          throw new UnauthenticatedError("Authentication required");
        }

        const user = await userRepository.findById(userId);
        if (!user) {
          throw new UnauthenticatedError("User account not found");
        }

        if (user.status === "disabled") {
          throw new AccountDisabledError("This account is disabled. Please contact support.");
        }

        res.status(200).json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
            isDemo: user.isDemo,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
        const newSession = await rotate(rawRefreshToken, req.requestId);
        setAuthCookies(res, newSession);
        res.status(204).end();
      } catch (err) {
        clearAuthCookies(res);
        next(err);
      }
    },

    async logoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
        await logout(rawRefreshToken, req.requestId);
        clearAuthCookies(res);
        res.status(204).end();
      } catch (err) {
        clearAuthCookies(res);
        next(err);
      }
    },

    async logoutAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = req.auth?.userId;
        if (userId) {
          await logoutAll(userId, req.requestId);
        }
        clearAuthCookies(res);
        res.status(204).end();
      } catch (err) {
        clearAuthCookies(res);
        next(err);
      }
    },

    async demoLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!env.DEMO_LOGIN_ENABLED) {
          throw new NotFoundError("Demo login is not enabled in this environment");
        }

        const demoUser = await userRepository.upsertDemoUser({
          email: "demo@saath.invalid",
          name: "Saath Demo User",
        });

        const session = await startSession(demoUser.id, req.requestId, "auth.demo_login");
        setAuthCookies(res, session);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  };
}
