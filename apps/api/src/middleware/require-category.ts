import type { NextFunction, Request, Response } from "express";
import { NotFoundError, UnauthenticatedError } from "../errors/http-errors.js";

export type SharableCategory = "medicines" | "reports" | "appointments";

/**
 * Access control middleware enforcing category-level sharing permissions.
 * Elder and editor roles always have access.
 * Viewer role is restricted based on the profile's sharing toggles.
 * Returns 404 NOT_FOUND if category sharing is disabled for viewers.
 */
export function requireCategory(category: SharableCategory) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth?.userId) {
      throw new UnauthenticatedError("Authentication required");
    }

    const membership = req.membership;
    const profile = req.profile;

    if (!membership || !profile) {
      throw new NotFoundError("Profile not found");
    }

    // Elder and editor have full access to all categories
    if (membership.role === "elder" || membership.role === "editor") {
      return next();
    }

    // For viewer role, verify category is enabled in profile sharing configuration
    if (membership.role === "viewer") {
      const isShared = profile.sharing?.[category] ?? true;
      if (!isShared) {
        throw new NotFoundError(
          `${category.charAt(0).toUpperCase() + category.slice(1)} access is not shared with viewers`,
        );
      }
    }

    next();
  };
}
