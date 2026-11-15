import helmet from "helmet";
import type { RequestHandler } from "express";

/**
 * Hardened Helmet security headers configured for an API backend.
 */
export const securityMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  noSniff: true,
  referrerPolicy: {
    policy: "no-referrer",
  },
  xPoweredBy: false,
});
