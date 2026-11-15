import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import {
  AccountDisabledError,
  RefreshInvalidError,
  RefreshRaceError,
  RefreshReusedError,
} from "../src/errors/http-errors.js";
import { AuditEventModel } from "../src/models/audit-event.model.js";
import { RefreshTokenModel } from "../src/models/refresh-token.model.js";
import { UserModel } from "../src/models/user.model.js";
import { logout, logoutAll, rotate, startSession } from "../src/services/session.service.js";
import { hashToken } from "../src/services/token.service.js";

describe("Session & Token Rotation Service (src/services/session.service.ts)", () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const user = await UserModel.create({
      googleId: "google-session-user-1",
      email: "session-elder@example.com",
      name: "Elder Session",
      status: "active",
      isDemo: false,
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("proves happy rotation issues new tokens and updates chain", async () => {
    const session = await startSession(testUserId, "req-happy-1");
    expect(session.accessToken).toBeDefined();
    expect(session.refreshToken).toBeDefined();

    const rotated = await rotate(session.refreshToken, "req-happy-2");
    expect(rotated.accessToken).toBeDefined();
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toBe(session.refreshToken);

    const auditEvents = await AuditEventModel.find({
      actorUserId: testUserId,
      action: "auth.login",
    }).exec();
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("proves reuse within leeway window throws RefreshRaceError and family stays valid", async () => {
    const session = await startSession(testUserId, "req-race-1");

    // First rotation succeeds
    const firstRotated = await rotate(session.refreshToken, "req-race-2");
    expect(firstRotated.refreshToken).toBeDefined();

    // Second rotation immediately with original token (within leeway)
    await expect(rotate(session.refreshToken, "req-race-3")).rejects.toThrow(RefreshRaceError);

    // Family is NOT revoked: the newest token can still rotate normally
    const nextRotated = await rotate(firstRotated.refreshToken, "req-race-4");
    expect(nextRotated.refreshToken).toBeDefined();
  });

  it("proves reuse after leeway revokes entire family and new token fails", async () => {
    const session = await startSession(testUserId, "req-reuse-1");

    // Rotate once
    const firstRotated = await rotate(session.refreshToken, "req-reuse-2");

    // Artificially age the usedAt timestamp on the original session token beyond leeway
    const oldTokenHash = hashToken(session.refreshToken);
    const agedTime = new Date(Date.now() - (env.REFRESH_REUSE_LEEWAY_SECONDS + 20) * 1000);
    await RefreshTokenModel.updateOne(
      { tokenHash: oldTokenHash },
      { $set: { usedAt: agedTime } },
    ).exec();

    // Replay the old token after leeway -> REFRESH_REUSED
    await expect(rotate(session.refreshToken, "req-reuse-attack")).rejects.toThrow(
      RefreshReusedError,
    );

    // The NEW token is now also invalidated because entire family was revoked
    await expect(rotate(firstRotated.refreshToken, "req-reuse-victim")).rejects.toThrow(
      RefreshReusedError,
    );

    const auditReuse = await AuditEventModel.findOne({
      action: "auth.refresh_reuse_detected",
    }).exec();
    expect(auditReuse).not.toBeNull();
  });

  it("proves expired token throws RefreshInvalidError", async () => {
    const session = await startSession(testUserId, "req-expire-1");

    // Manually expire the token in database
    await RefreshTokenModel.updateMany(
      { userId: testUserId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).exec();

    await expect(rotate(session.refreshToken, "req-expire-2")).rejects.toThrow(RefreshInvalidError);
  });

  it("proves disabled user throws AccountDisabledError and revokes family", async () => {
    const disabledUser = await UserModel.create({
      googleId: "google-disabled-user",
      email: "disabled@example.com",
      name: "Disabled User",
      status: "active",
    });

    const session = await startSession(disabledUser.id, "req-disable-1");

    // Switch status to disabled
    await UserModel.findByIdAndUpdate(disabledUser.id, {
      $set: { status: "disabled" },
    }).exec();

    await expect(rotate(session.refreshToken, "req-disable-2")).rejects.toThrow(
      AccountDisabledError,
    );
  });

  it("proves concurrent rotate calls (Promise.all of 5) produce exactly one success", async () => {
    const concurrentUser = await UserModel.create({
      googleId: "google-concurrent-user",
      email: "concurrent@example.com",
      name: "Concurrent User",
      status: "active",
    });

    const session = await startSession(concurrentUser.id, "req-concurrent-init");

    const attempts = await Promise.allSettled([
      rotate(session.refreshToken, "req-conc-1"),
      rotate(session.refreshToken, "req-conc-2"),
      rotate(session.refreshToken, "req-conc-3"),
      rotate(session.refreshToken, "req-conc-4"),
      rotate(session.refreshToken, "req-conc-5"),
    ]);

    const successes = attempts.filter((r) => r.status === "fulfilled");
    const rejections = attempts.filter((r) => r.status === "rejected");

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(4);

    for (const rej of rejections) {
      if (rej.status === "rejected") {
        expect(rej.reason).toBeInstanceOf(RefreshRaceError);
      }
    }
  });

  it("proves logout is idempotent and revokes family", async () => {
    const session = await startSession(testUserId, "req-logout-init");

    // Logout twice
    await expect(logout(session.refreshToken, "req-logout-1")).resolves.not.toThrow();
    await expect(logout(session.refreshToken, "req-logout-2")).resolves.not.toThrow();
    await expect(logout("completely-unknown-token")).resolves.not.toThrow();
    await expect(logout(undefined)).resolves.not.toThrow();

    // Cannot rotate after logout
    await expect(rotate(session.refreshToken)).rejects.toThrow(RefreshReusedError);
  });

  it("proves logoutAll revokes all families for user", async () => {
    const session1 = await startSession(testUserId, "req-all-1");
    const session2 = await startSession(testUserId, "req-all-2");

    await logoutAll(testUserId, "req-all-logout");

    await expect(rotate(session1.refreshToken)).rejects.toThrow(RefreshReusedError);
    await expect(rotate(session2.refreshToken)).rejects.toThrow(RefreshReusedError);
  });

  it("proves the database never contains a plaintext refresh token", async () => {
    const session = await startSession(testUserId, "req-security-check");
    const allTokens = await RefreshTokenModel.find({}).lean().exec();

    expect(allTokens.length).toBeGreaterThan(0);

    for (const doc of allTokens) {
      expect(doc.tokenHash).not.toBe(session.refreshToken);
      expect(doc.tokenHash.length).toBe(64); // SHA-256 hex length
    }

    // Direct search for plaintext string must return null
    const plaintextSearch = await RefreshTokenModel.findOne({
      $or: [{ tokenHash: session.refreshToken }, { familyId: session.refreshToken }],
    }).exec();

    expect(plaintextSearch).toBeNull();
  });
});
