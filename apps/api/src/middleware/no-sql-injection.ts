import type { NextFunction, Request, Response } from "express";

function containsInjectionKey(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (containsInjectionKey(item)) {
        return true;
      }
    }
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "object" && val !== null) {
      if (containsInjectionKey(val)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Rejects any incoming request whose body, query parameters, or route params contain keys
 * starting with "$" or containing "." with an HTTP 400 VALIDATION_ERROR envelope without mutating the request.
 */
export function noSqlInjectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (
    containsInjectionKey(req.body) ||
    containsInjectionKey(req.query) ||
    containsInjectionKey(req.params)
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Prohibited query or payload structure detected",
        requestId: req.requestId,
      },
    });
    return;
  }

  next();
}
