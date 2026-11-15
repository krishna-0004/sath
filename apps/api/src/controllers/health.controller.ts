import { getLiveness, getReadiness } from "../services/health.service.js";
import type { Request, Response } from "express";

/**
 * Handles liveness probe requests (GET /api/health).
 */
export function healthCheck(_req: Request, res: Response): void {
  const liveness = getLiveness();
  res.status(200).json(liveness);
}

/**
 * Handles readiness probe requests (GET /api/ready).
 */
export function readyCheck(_req: Request, res: Response): void {
  const readiness = getReadiness();
  res.status(200).json(readiness);
}
