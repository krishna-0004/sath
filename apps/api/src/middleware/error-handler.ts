import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { logger } from "../config/logger.js";
import type { NextFunction, Request, Response } from "express";

interface MongooseDuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

/**
 * Central error handling middleware returning standardized error envelopes.
 */
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4 arguments to recognize an error-handling middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId || "unknown";
  const isProduction = process.env["NODE_ENV"] === "production";

  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected server error occurred";
  let details: { path: string; message: string }[] | undefined;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
  } else if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    status = 400;
    code = "INVALID_JSON";
    message = "Malformed JSON syntax in request body";
  } else if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.too.large"
  ) {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body exceeded maximum allowable size";
  } else if (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err.name === "ValidationError" || err.name === "CastError")
  ) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = (err as Error).message;
  } else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as MongooseDuplicateKeyError).code === 11000
  ) {
    status = 409;
    code = "CONFLICT";
    message = "A resource with these details already exists";
  } else if (err instanceof Error) {
    if (!isProduction) {
      message = err.message;
    }
  }

  // Structured logging: 5xx at error level with stack/cause; 4xx at warn level without stack
  if (status >= 500) {
    logger.error(
      {
        requestId,
        status,
        code,
        err,
        stack: err instanceof Error ? err.stack : undefined,
        cause: err instanceof Error ? err.cause : undefined,
      },
      "Unhandled server exception",
    );
  } else {
    logger.warn(
      {
        requestId,
        status,
        code,
        message,
      },
      "Handled operational warning",
    );
  }

  const envelope: {
    error: {
      code: string;
      message: string;
      details?: { path: string; message: string }[];
      requestId: string;
    };
  } = {
    error: {
      code,
      message,
      requestId,
    },
  };

  if (details && details.length > 0) {
    envelope.error.details = details;
  }

  res.status(status).json(envelope);
}
