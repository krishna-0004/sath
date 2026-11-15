import type { Request, Response } from "express";
import { profileService } from "../services/profile.service.js";
import { ForbiddenError, UnauthenticatedError } from "../errors/http-errors.js";
import type {
  CreateProfileInput,
  UpdateProfileInput,
  JoinProfileInput,
  RotatePasscodeInput,
  UpdateSharingInput,
  UpdateMemberRoleInput,
} from "../schemas/profile.schema.js";

function getUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthenticatedError("Authentication required");
  }
  return userId;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val) return "";
  return Array.isArray(val) ? val[0]! : val;
}

export const profileController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const input = (req.validated?.body ?? req.body) as CreateProfileInput;
    const result = await profileService.createProfile(userId, input, req.requestId);
    res.status(201).json({
      profile: result.profile.toJSON(),
      membership: result.membership.toJSON(),
    });
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profiles = await profileService.listProfilesForUser(userId);
    res.json({
      profiles: profiles.map((p) => ({
        profile: p.profile.toJSON(),
        role: p.role,
        joinedAt: p.joinedAt,
      })),
    });
  },

  async get(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const profile = req.profile ?? (await profileService.getProfileById(profileId));
    res.json({
      profile: profile.toJSON(),
      role: req.membership?.role,
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const input = (req.validated?.body ?? req.body) as UpdateProfileInput;
    const updated = await profileService.updateProfile(profileId, input);
    res.json({ profile: updated.toJSON() });
  },

  async rotatePasscode(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id");
    const input = (req.validated?.body ?? req.body) as RotatePasscodeInput;
    await profileService.rotatePasscode(profileId, input.passcode, userId, req.requestId);
    res.status(204).send();
  },

  async join(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const input = (req.validated?.body ?? req.body) as JoinProfileInput;
    const result = await profileService.joinProfile(
      userId,
      input.joinCode,
      input.passcode,
      req.requestId,
    );
    res.json({
      profile: result.profile.toJSON(),
      membership: result.membership.toJSON(),
      alreadyMember: result.alreadyMember,
    });
  },

  async listMembers(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const members = await profileService.listMembers(profileId);
    res.json({ members });
  },

  async updateMemberRole(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id");
    const targetUserId = getParam(req, "userId");
    const input = (req.validated?.body ?? req.body) as UpdateMemberRoleInput;

    const updated = await profileService.updateMemberRole(
      profileId,
      targetUserId,
      input.role,
      userId,
      req.requestId,
    );
    res.json({ membership: updated.toJSON() });
  },

  async removeMember(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id");
    const targetUserId = getParam(req, "userId");

    // Must be either an elder or leaving oneself
    if (req.membership?.role !== "elder" && userId !== targetUserId) {
      throw new ForbiddenError("Insufficient permissions to remove member");
    }

    await profileService.removeMember(profileId, targetUserId, userId, req.requestId);
    res.status(204).send();
  },

  async updateSharing(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id");
    const input = (req.validated?.body ?? req.body) as UpdateSharingInput;

    const updated = await profileService.updateSharing(profileId, userId, input, req.requestId);
    res.json({ sharing: updated.sharing });
  },

  async delete(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id");
    await profileService.deleteProfile(profileId, userId, req.requestId);
    res.status(204).send();
  },
};
