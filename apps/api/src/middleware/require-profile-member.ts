import type { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors/http-errors.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";

/**
 * Access control middleware verifying that the authenticated user is an active member
 * of the target profile. Returns 404 NOT_FOUND (never 403) if the profile does not exist
 * or the user is not a member, preventing cross-profile discovery/leakage (IDOR defense).
 */
export async function requireProfileMember(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthenticatedError("Authentication required");
  }

  const rawProfileId = req.params["profileId"] || req.params["id"];
  const profileId = Array.isArray(rawProfileId) ? rawProfileId[0] : rawProfileId;

  if (!profileId || !isValidObjectId(profileId)) {
    throw new ValidationError("Invalid profile ID", [
      { path: "profileId", message: "Must be a valid 24-character hexadecimal ObjectId" },
    ]);
  }

  const [profile, membership] = await Promise.all([
    profileRepository.findById(profileId),
    membershipRepository.findActiveByProfileAndUser(profileId, userId),
  ]);

  // Return 404 if profile doesn't exist or caller is not an active member
  if (!profile || !membership) {
    throw new NotFoundError("Profile not found");
  }

  req.profile = profile;
  req.membership = membership;

  next();
}
