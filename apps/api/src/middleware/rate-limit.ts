import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Creates an express-rate-limit middleware returning the standard error envelope on limit breach.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req: Request, res: Response) {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: options.message || "Too many requests. Please try again later.",
          requestId: req.requestId,
        },
      });
    },
  });
}

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 */
export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/**
 * Strict rate limiter for sensitive endpoints: 10 requests per 15 minutes per IP.
 */
export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts on this sensitive endpoint. Please wait 15 minutes.",
});
