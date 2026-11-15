import { RefreshTokenModel, type RefreshTokenDocument } from "../models/refresh-token.model.js";

export interface CreateRefreshTokenInput {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  replacedById?: string | null;
}

export const refreshTokenRepository = {
  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenDocument> {
    return RefreshTokenModel.create({
      userId: input.userId,
      familyId: input.familyId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      replacedById: input.replacedById ?? null,
      usedAt: null,
      revokedAt: null,
    });
  },

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).exec();
  },

  /**
   * Atomically claims an unused, unrevoked refresh token.
   * Returns the updated document if claim succeeded, or null if already used/revoked.
   */
  async claimToken(tokenHash: string, usedAt: Date): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOneAndUpdate(
      { tokenHash, usedAt: null, revokedAt: null },
      { $set: { usedAt } },
      { new: true },
    ).exec();
  },

  /**
   * Returns the latest created token in a family, useful for race detection.
   */
  async findLatestInFamily(familyId: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ familyId }).sort({ createdAt: -1 }).exec();
  },

  /**
   * Revokes all active tokens in a family (used when reuse is detected or user logs out).
   */
  async revokeFamily(familyId: string, revokedAt: Date): Promise<number> {
    const result = await RefreshTokenModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt } },
    ).exec();
    return result.modifiedCount;
  },

  /**
   * Revokes all active refresh tokens belonging to a user across all sessions.
   */
  async revokeAllForUser(userId: string, revokedAt: Date): Promise<number> {
    const result = await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt } },
    ).exec();
    return result.modifiedCount;
  },
};
