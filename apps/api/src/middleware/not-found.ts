import type { Request, Response } from "express";

/**
 * Fallback middleware for unmapped routes, returning the standard 404 envelope.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
      requestId: req.requestId,
    },
  });
}
