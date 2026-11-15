import type { NextFunction, Request, Response } from "express";
import { UnauthenticatedError } from "../errors/http-errors.js";
import { COOKIE_NAMES } from "../services/cookie.service.js";
import { verifyAccessToken } from "../services/token.service.js";

/**
 * Authentication middleware verifying the short-lived access JWT.
 * Reads the host-only httpOnly `saath_at` cookie and attaches `req.auth = { userId }`.
 * Performs pure cryptographic validation without database overhead.
 */
export async function requireAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

  if (!token || typeof token !== "string") {
    throw new UnauthenticatedError("Authentication required");
  }

  const verified = await verifyAccessToken(token);
  req.auth = { userId: verified.userId };

  next();
}

export const requireAuth = requireAuthMiddleware;
