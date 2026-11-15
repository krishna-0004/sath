import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConflictError } from "../src/errors/http-errors.js";
import { AuditEventModel } from "../src/models/audit-event.model.js";
import { RefreshTokenModel } from "../src/models/refresh-token.model.js";
import { UserModel } from "../src/models/user.model.js";
import { auditEventRepository } from "../src/repositories/audit-event.repository.js";
import { refreshTokenRepository } from "../src/repositories/refresh-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";

describe("Phase 1 Data Layer Repositories & Models", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Ensure all indexes are built
    await UserModel.syncIndexes();
    await RefreshTokenModel.syncIndexes();
    await AuditEventModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("verifies and prints database indexes for all three collections", async () => {
    const userIndexes = await UserModel.collection.getIndexes();
    const tokenIndexes = await RefreshTokenModel.collection.getIndexes();
    const auditIndexes = await AuditEventModel.collection.getIndexes();

    process.stdout.write(
      `\n=== UserModel.collection.getIndexes() ===\n${JSON.stringify(userIndexes, null, 2)}\n`,
    );
    process.stdout.write(
      `\n=== RefreshTokenModel.collection.getIndexes() ===\n${JSON.stringify(tokenIndexes, null, 2)}\n`,
    );
    process.stdout.write(
      `\n=== AuditEventModel.collection.getIndexes() ===\n${JSON.stringify(auditIndexes, null, 2)}\n`,
    );

    // Verify User indexes
    expect(userIndexes).toHaveProperty("googleId_1");
    expect(userIndexes).toHaveProperty("email_1");

    // Verify RefreshToken indexes (including TTL index)
    expect(tokenIndexes).toHaveProperty("tokenHash_1");
    expect(tokenIndexes).toHaveProperty("expiresAt_1");
    expect(tokenIndexes).toHaveProperty("familyId_1_revokedAt_1");

    // Verify AuditEvent indexes
    expect(auditIndexes).toHaveProperty("action_1");
  });

  it("proves User upsert is idempotent for Google users", async () => {
    const userInput = {
      googleId: "google-sub-12345",
      email: "elder@example.com",
      name: "Elder Initial",
      avatarUrl: "https://example.com/avatar1.png",
    };

    // First upsert
    const firstResult = await userRepository.upsertGoogleUser(userInput);
    expect(firstResult.id).toBeDefined();
    expect(firstResult.name).toBe("Elder Initial");
    expect(firstResult.status).toBe("active");

    // Second upsert with updated name
    const updatedInput = {
      ...userInput,
      name: "Elder Updated",
      avatarUrl: "https://example.com/avatar2.png",
    };
    const secondResult = await userRepository.upsertGoogleUser(updatedInput);
    expect(secondResult.id).toBe(firstResult.id);
    expect(secondResult.name).toBe("Elder Updated");
    expect(secondResult.avatarUrl).toBe("https://example.com/avatar2.png");

    const totalCount = await UserModel.countDocuments({ googleId: userInput.googleId });
    expect(totalCount).toBe(1);

    // Test findById, findByEmail, findByGoogleId, updateStatus
    const byId = await userRepository.findById(firstResult.id);
    expect(byId?.email).toBe(userInput.email);

    const byEmail = await userRepository.findByEmail(userInput.email);
    expect(byEmail?.name).toBe("Elder Updated");

    const byGoogle = await userRepository.findByGoogleId(userInput.googleId);
    expect(byGoogle?.id).toBe(firstResult.id);

    const disabled = await userRepository.updateStatus(firstResult.id, "disabled");
    expect(disabled?.status).toBe("disabled");

    // Test toJSON removes _id and __v and adds id
    const json = firstResult.toJSON() as { id?: string; _id?: unknown; __v?: unknown };
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });

  it("proves Demo user upsert works as expected", async () => {
    const demoUser = await userRepository.upsertDemoUser({
      email: "demo@saath.invalid",
      name: "Demo Account",
    });

    expect(demoUser.isDemo).toBe(true);
    expect(demoUser.email).toBe("demo@saath.invalid");
    expect(demoUser.status).toBe("active");
  });

  it("proves duplicate email with different identity throws ConflictError", async () => {
    const userA = {
      googleId: "google-sub-aaa",
      email: "conflict@example.com",
      name: "User A",
    };
    await userRepository.upsertGoogleUser(userA);

    const userB = {
      googleId: "google-sub-bbb",
      email: "conflict@example.com",
      name: "User B",
    };

    await expect(userRepository.upsertGoogleUser(userB)).rejects.toThrow(ConflictError);
  });

  it("proves RefreshToken lifecycle: creation, atomic claim, and family revocation", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await refreshTokenRepository.create({
      userId,
      familyId: "family-session-123",
      tokenHash: "sha256-hash-value-abc",
      expiresAt,
    });

    expect(token.id).toBeDefined();
    expect(token.usedAt).toBeNull();
    expect(token.revokedAt).toBeNull();

    // Verify findByTokenHash
    const foundToken = await refreshTokenRepository.findByTokenHash("sha256-hash-value-abc");
    expect(foundToken?.familyId).toBe("family-session-123");

    // Verify findLatestInFamily
    const latest = await refreshTokenRepository.findLatestInFamily("family-session-123");
    expect(latest?.tokenHash).toBe("sha256-hash-value-abc");

    // Atomic claim succeeds on unused token
    const claimTime = new Date();
    const claimed = await refreshTokenRepository.claimToken("sha256-hash-value-abc", claimTime);
    expect(claimed).not.toBeNull();
    expect(claimed?.usedAt).toBeDefined();

    // Second claim fails (already claimed)
    const secondClaim = await refreshTokenRepository.claimToken(
      "sha256-hash-value-abc",
      new Date(),
    );
    expect(secondClaim).toBeNull();

    // Family revocation
    const revokeCount = await refreshTokenRepository.revokeFamily("family-session-123", new Date());
    expect(revokeCount).toBeGreaterThanOrEqual(1);

    // Revoke all for user
    const userRevokeCount = await refreshTokenRepository.revokeAllForUser(userId, new Date());
    expect(userRevokeCount).toBe(0); // already revoked above

    // Test toJSON
    const tokenJson = token.toJSON() as { id?: string; _id?: unknown; __v?: unknown };
    expect(tokenJson.id).toBeDefined();
    expect(tokenJson._id).toBeUndefined();
    expect(tokenJson.__v).toBeUndefined();
  });

  it("proves AuditEvent repository exposes ONLY create (strictly append-only)", async () => {
    const repoMethods = Object.keys(auditEventRepository);
    expect(repoMethods).toEqual(["create"]);
    expect(auditEventRepository).not.toHaveProperty("update");
    expect(auditEventRepository).not.toHaveProperty("delete");
    expect(auditEventRepository).not.toHaveProperty("findByIdAndUpdate");
    expect(auditEventRepository).not.toHaveProperty("deleteOne");

    const event = await auditEventRepository.create({
      action: "auth.login",
      outcome: "success",
      metadata: { method: "google" },
      requestId: "req-12345",
    });

    expect(event.id).toBeDefined();
    expect(event.action).toBe("auth.login");
    expect(event.outcome).toBe("success");

    // Test toJSON
    const eventJson = event.toJSON() as { id?: string; _id?: unknown; __v?: unknown };
    expect(eventJson.id).toBeDefined();
    expect(eventJson._id).toBeUndefined();
    expect(eventJson.__v).toBeUndefined();
  });
});
