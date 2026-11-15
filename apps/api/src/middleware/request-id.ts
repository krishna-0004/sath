import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates incoming X-Request-Id header as UUID or assigns a new UUID v4.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers["x-request-id"];
  const isValid = typeof incomingId === "string" && UUID_REGEX.test(incomingId);

  const requestId = isValid ? incomingId : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}
