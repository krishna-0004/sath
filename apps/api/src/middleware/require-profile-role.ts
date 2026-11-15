import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthenticatedError } from "../errors/http-errors.js";
import type { ProfileRole } from "../models/membership.model.js";

/**
 * Access control middleware enforcing specific profile roles.
 * Must be executed after requireProfileMember.
 */
export function requireProfileRole(...allowedRoles: ProfileRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth?.userId) {
      throw new UnauthenticatedError("Authentication required");
    }

    const membership = req.membership;
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenError(
        `Action requires one of the following roles: ${allowedRoles.join(", ")}`,
      );
    }

    next();
  };
}
