import { JoinAttemptModel, type JoinAttemptDocument } from "../models/join-attempt.model.js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ATTEMPT_TTL_HOURS = 24;

export const joinAttemptRepository = {
  async getAttempt(userId: string, joinCode: string): Promise<JoinAttemptDocument | null> {
    return JoinAttemptModel.findOne({
      userId,
      joinCode: joinCode.trim().toUpperCase(),
    }).exec();
  },

  async isLocked(userId: string, joinCode: string): Promise<boolean> {
    const attempt = await this.getAttempt(userId, joinCode);
    if (!attempt || !attempt.lockedUntil) {
      return false;
    }
    return attempt.lockedUntil.getTime() > Date.now();
  },

  async recordFailure(
    userId: string,
    joinCode: string,
  ): Promise<{ locked: boolean; count: number; lockedUntil: Date | null }> {
    const normalizedCode = joinCode.trim().toUpperCase();
    const existing = await JoinAttemptModel.findOne({
      userId,
      joinCode: normalizedCode,
    }).exec();

    const expireAt = new Date(Date.now() + ATTEMPT_TTL_HOURS * 60 * 60 * 1000);

    if (!existing) {
      const created = await JoinAttemptModel.create({
        userId,
        joinCode: normalizedCode,
        count: 1,
        lockedUntil: null,
        expireAt,
      });
      return { locked: false, count: created.count, lockedUntil: null };
    }

    const newCount = existing.count + 1;
    let lockedUntil = existing.lockedUntil;
    if (newCount >= MAX_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    existing.count = newCount;
    existing.lockedUntil = lockedUntil;
    existing.expireAt = expireAt;
    await existing.save();

    return {
      locked: Boolean(lockedUntil && lockedUntil.getTime() > Date.now()),
      count: newCount,
      lockedUntil,
    };
  },

  async resetAttempt(userId: string, joinCode: string): Promise<void> {
    await JoinAttemptModel.deleteOne({
      userId,
      joinCode: joinCode.trim().toUpperCase(),
    }).exec();
  },

  async deleteByUserId(userId: string): Promise<number> {
    const res = await JoinAttemptModel.deleteMany({ userId }).exec();
    return res.deletedCount ?? 0;
  },
};
