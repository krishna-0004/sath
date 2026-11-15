import { isDbReady } from "../db/connect.js";
import { ServiceUnavailableError } from "../errors/http-errors.js";

export interface LivenessResult {
  status: "ok";
  uptime: number;
  timestamp: string;
  version: string;
}

export interface ReadinessResult {
  status: "ok";
  database: "connected";
}

/**
 * Returns basic service liveness metadata without checking external dependencies.
 */
export function getLiveness(): LivenessResult {
  return {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  };
}

/**
 * Validates readiness by verifying database connectivity.
 * Throws ServiceUnavailableError if the database is disconnected.
 */
export function getReadiness(): ReadinessResult {
  if (!isDbReady()) {
    throw new ServiceUnavailableError("Database connection is not ready");
  }

  return {
    status: "ok",
    database: "connected",
  };
}
