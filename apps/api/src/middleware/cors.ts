import cors from "cors";
import { env } from "../config/env.js";
import type { RequestHandler } from "express";

const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((s) => s.trim());

/**
 * Strict CORS middleware allowing credentials and whitelisted client origins.
 */
export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    // Allow non-browser tools (e.g. curl, server-to-server) where origin is undefined
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Saath-CSRF"],
  exposedHeaders: ["X-Request-Id"],
});
