import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";
import type { Request, Response } from "express";

export const httpLoggerMiddleware = pinoHttp({
  logger,
  customLogLevel(_req: Request, res: Response, err?: Error): "error" | "warn" | "info" {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
  customProps(req: Request) {
    return {
      requestId: req.requestId,
    };
  },
  // Suppress request/response body logging for confidentiality and privacy
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
