import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { CsrfRejectedError } from "../errors/http-errors.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Cross-Site Request Forgery (CSRF) protection guard.
 * Enforces X-Saath-CSRF: 1 header on all mutating methods (POST, PUT, PATCH, DELETE)
 * and verifies that the Origin header (when supplied) strictly matches allowed client origins.
 */
export function csrfGuardMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  // 1. Check custom anti-CSRF header
  const csrfHeader = req.headers["x-saath-csrf"];
  if (csrfHeader !== "1") {
    throw new CsrfRejectedError("Missing or invalid X-Saath-CSRF header");
  }

  // 2. Validate Origin header if present
  const origin = req.headers["origin"];
  if (origin && typeof origin === "string") {
    const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim());
    if (!allowedOrigins.includes(origin)) {
      throw new CsrfRejectedError("Request Origin does not match allowed client origins");
    }
  }

  next();
}
