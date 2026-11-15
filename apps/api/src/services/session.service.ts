import crypto from "node:crypto";
import { env } from "../config/env.js";
import {
  AccountDisabledError,
  RefreshInvalidError,
  RefreshRaceError,
  RefreshReusedError,
} from "../errors/http-errors.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { generateRefreshToken, hashToken, signAccessToken } from "./token.service.js";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Starts a new authenticated session for a user, creating a new token family.
 */
export async function startSession(
  userId: string,
  requestId?: string,
  action: "auth.login" | "auth.demo_login" = "auth.login",
): Promise<SessionTokens> {
  const familyId = crypto.randomUUID();
  const { raw, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    userId,
    familyId,
    tokenHash: hash,
    expiresAt,
  });

  const accessToken = await signAccessToken(userId);

  await auditEventRepository.create({
    actorUserId: userId,
    action,
    outcome: "success",
    metadata: { familyId },
    requestId,
  });

  return { accessToken, refreshToken: raw };
}

/**
 * Rotates an existing refresh token with reuse detection and race condition leeway.
 */
export async function rotate(rawRefreshToken: string, requestId?: string): Promise<SessionTokens> {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    throw new RefreshInvalidError("Missing refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const token = await refreshTokenRepository.findByTokenHash(tokenHash);

  if (!token) {
    throw new RefreshInvalidError("Invalid refresh token");
  }

  const now = new Date();

  // Check token expiration
  if (token.expiresAt.getTime() <= now.getTime()) {
    throw new RefreshInvalidError("Refresh token has expired");
  }

  // If already revoked, whole family is compromised
  if (token.revokedAt !== null) {
    await refreshTokenRepository.revokeFamily(token.familyId, now);
    await auditEventRepository.create({
      actorUserId: token.userId.toString(),
      action: "auth.refresh_reuse_detected",
      outcome: "failure",
      metadata: { familyId: token.familyId, reason: "token_already_revoked" },
      requestId,
    });
    throw new RefreshReusedError("Session revoked due to token reuse");
  }

  // Atomically claim the token
  const claimed = await refreshTokenRepository.claimToken(tokenHash, now);

  if (!claimed) {
    // Claim failed: token was already claimed or updated concurrently
    const existing = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (existing?.usedAt) {
      const elapsedSeconds = (now.getTime() - existing.usedAt.getTime()) / 1000;
      const latest = await refreshTokenRepository.findLatestInFamily(existing.familyId);

      const isNewestRotation =
        latest?.replacedById?.toString() === existing.id || latest?.id === existing.id;

      if (elapsedSeconds <= env.REFRESH_REUSE_LEEWAY_SECONDS && isNewestRotation) {
        throw new RefreshRaceError("Concurrent token rotation detected. Please retry.");
      }

      // Reuse detected beyond leeway: revoke entire family
      await refreshTokenRepository.revokeFamily(existing.familyId, now);
      await auditEventRepository.create({
        actorUserId: existing.userId.toString(),
        action: "auth.refresh_reuse_detected",
        outcome: "failure",
        metadata: { familyId: existing.familyId, elapsedSeconds },
        requestId,
      });
      throw new RefreshReusedError("Session revoked due to token reuse");
    }

    throw new RefreshInvalidError("Refresh token is no longer valid");
  }

  // Ensure user is still active
  const user = await userRepository.findById(claimed.userId.toString());
  if (!user || user.status !== "active") {
    await refreshTokenRepository.revokeFamily(claimed.familyId, now);
    throw new AccountDisabledError("Account has been disabled");
  }

  // Issue new token in the same family, linking replacedById
  const { raw: newRaw, hash: newHash } = generateRefreshToken();
  const newExpiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    userId: claimed.userId.toString(),
    familyId: claimed.familyId,
    tokenHash: newHash,
    expiresAt: newExpiresAt,
    replacedById: claimed.id,
  });

  const accessToken = await signAccessToken(claimed.userId.toString());

  return { accessToken, refreshToken: newRaw };
}

/**
 * Idempotently logs out a session by revoking its token family.
 */
export async function logout(rawRefreshToken?: string, requestId?: string): Promise<void> {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const token = await refreshTokenRepository.findByTokenHash(tokenHash);

  if (token) {
    await refreshTokenRepository.revokeFamily(token.familyId, new Date());
    await auditEventRepository.create({
      actorUserId: token.userId.toString(),
      action: "auth.logout",
      outcome: "success",
      metadata: { familyId: token.familyId },
      requestId,
    });
  }
}

/**
 * Revokes all session families belonging to a user.
 */
export async function logoutAll(userId: string, requestId?: string): Promise<void> {
  await refreshTokenRepository.revokeAllForUser(userId, new Date());
  await auditEventRepository.create({
    actorUserId: userId,
    action: "auth.logout_all",
    outcome: "success",
    metadata: {},
    requestId,
  });
}
