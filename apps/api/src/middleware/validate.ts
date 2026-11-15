import { ZodError, type ZodSchema } from "zod";
import { ValidationError } from "../errors/http-errors.js";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates request body, query, or params using Zod schemas and binds validated output to req.validated.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = req.validated || {};

      if (schemas.body) {
        req.validated.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.validated.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.validated.params = schemas.params.parse(req.params);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        next(new ValidationError("Request validation failed", details));
        return;
      }
      next(err);
    }
  };
}
