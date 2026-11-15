import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/models/user.model.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Phase 2 Care Core - Profile Endpoints", () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = createApp();

    // Create test users
    const [userA, userB, userC] = await Promise.all([
      UserModel.create({
        googleId: "google-user-a",
        email: "user.a@example.com",
        name: "User A (Owner)",
      }),
      UserModel.create({
        googleId: "google-user-b",
        email: "user.b@example.com",
        name: "User B (Joiner)",
      }),
      UserModel.create({
        googleId: "google-user-c",
        email: "user.c@example.com",
        name: "User C (Stranger)",
      }),
    ]);

    userAId = userA._id.toString();
    userBId = userB._id.toString();
    userCId = userC._id.toString();

    [tokenA, tokenB, tokenC] = await Promise.all([
      signAccessToken(userAId),
      signAccessToken(userBId),
      signAccessToken(userCId),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  let createdProfileId: string;
  let createdJoinCode: string;

  it("POST /api/profiles creates profile, assigns elder role and omits passcodeHash", async () => {
    const res = await request(app)
      .post("/api/profiles")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({
        elderName: "Grandpa Ramesh",
        passcode: "Secret12",
        emergencyPhone: "+919876543210",
      });

    expect(res.status).toBe(201);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.id).toBeDefined();
    expect(res.body.profile.elderName).toBe("Grandpa Ramesh");
    expect(res.body.profile.joinCode).toHaveLength(10);
    expect(res.body.profile.sharing).toEqual({
      medicines: true,
      reports: true,
      appointments: true,
    });
    expect(res.body.profile).not.toHaveProperty("passcodeHash");
    expect(res.body.membership.role).toBe("elder");

    createdProfileId = res.body.profile.id;
    createdJoinCode = res.body.profile.joinCode;
  });

  it("GET /api/profiles lists profiles caller is an active member of", async () => {
    const resA = await request(app)
      .get("/api/profiles")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.profiles).toHaveLength(1);
    expect(resA.body.profiles[0].profile.elderName).toBe("Grandpa Ramesh");
    expect(resA.body.profiles[0].role).toBe("elder");

    const resB = await request(app)
      .get("/api/profiles")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.profiles).toHaveLength(0);
  });

  it("IDOR protection: non-member gets 404 (never 403) accessing profile", async () => {
    const res = await request(app)
      .get(`/api/profiles/${createdProfileId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenC}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("POST /api/profiles/join enforces lockout on 5 consecutive failures", async () => {
    // 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      const failRes = await request(app)
        .post("/api/profiles/join")
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`)
        .set("X-Saath-CSRF", "1")
        .send({
          joinCode: createdJoinCode,
          passcode: "WrongPass",
        });

      expect(failRes.status).toBe(401);
      expect(failRes.body.error.code).toBe("JOIN_INVALID");
    }

    // 5th attempt locks out
    const lockRes = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "WrongPass",
      });

    expect(lockRes.status).toBe(429);
    expect(lockRes.body.error.code).toBe("JOIN_LOCKED");

    // Clear lockout record for userB so subsequent tests pass
    await mongoose.connection.collection("joinattempts").deleteMany({});
  });

  it("POST /api/profiles/join succeeds with valid credentials and creates viewer membership", async () => {
    const res = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "Secret12",
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(createdProfileId);
    expect(res.body.membership.role).toBe("viewer");
    expect(res.body.alreadyMember).toBe(false);

    // Joining again reports alreadyMember: true
    const reJoin = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "Secret12",
      });

    expect(reJoin.status).toBe(200);
    expect(reJoin.body.alreadyMember).toBe(true);
  });

  it("PATCH /api/profiles/:id permits elder and editor, but rejects viewer with 403", async () => {
    // User B is viewer -> 403
    const viewerPatch = await request(app)
      .patch(`/api/profiles/${createdProfileId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenB}`)
      .set("X-Saath-CSRF", "1")
      .send({ elderName: "Grandpa Ramesh Updated" });

    expect(viewerPatch.status).toBe(403);
    expect(viewerPatch.body.error.code).toBe("FORBIDDEN");

    // User A is elder -> 200
    const elderPatch = await request(app)
      .patch(`/api/profiles/${createdProfileId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ elderName: "Grandpa Ramesh Updated" });

    expect(elderPatch.status).toBe(200);
    expect(elderPatch.body.profile.elderName).toBe("Grandpa Ramesh Updated");
  });

  it("PATCH /api/profiles/:id/sharing updates toggles (elder only)", async () => {
    const res = await request(app)
      .patch(`/api/profiles/${createdProfileId}/sharing`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ reports: false });

    expect(res.status).toBe(200);
    expect(res.body.sharing.reports).toBe(false);
    expect(res.body.sharing.medicines).toBe(true);
  });

  it("POST /api/profiles/:id/rotate-passcode updates passcode and prevents old passcode", async () => {
    const rotateRes = await request(app)
      .post(`/api/profiles/${createdProfileId}/rotate-passcode`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ passcode: "NewPass456" });

    expect(rotateRes.status).toBe(204);

    // Old passcode fails
    const oldJoin = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenC}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "Secret12",
      });

    expect(oldJoin.status).toBe(401);

    // New passcode succeeds
    const newJoin = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenC}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "NewPass456",
      });

    expect(newJoin.status).toBe(200);
    expect(newJoin.body.membership.role).toBe("viewer");
  });

  it("manages members and prevents demoting or removing the only elder", async () => {
    // List members
    const membersRes = await request(app)
      .get(`/api/profiles/${createdProfileId}/members`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`);

    expect(membersRes.status).toBe(200);
    expect(membersRes.body.members).toHaveLength(3); // userA, userB, userC

    // Promote User B to editor
    const promoteRes = await request(app)
      .patch(`/api/profiles/${createdProfileId}/members/${userBId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ role: "editor" });

    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.membership.role).toBe("editor");

    // Attempt to demote User A (the only elder) -> 409
    const demoteElder = await request(app)
      .patch(`/api/profiles/${createdProfileId}/members/${userAId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ role: "editor" });

    expect(demoteElder.status).toBe(409);
    expect(demoteElder.body.error.code).toBe("CONFLICT");

    // Remove User C
    const removeC = await request(app)
      .delete(`/api/profiles/${createdProfileId}/members/${userCId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1");

    expect(removeC.status).toBe(204);

    const membersAfter = await request(app)
      .get(`/api/profiles/${createdProfileId}/members`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`);

    expect(membersAfter.body.members).toHaveLength(2);

    // User C rejoins after being removed (exercises reactivation branch)
    const rejoinC = await request(app)
      .post("/api/profiles/join")
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenC}`)
      .set("X-Saath-CSRF", "1")
      .send({
        joinCode: createdJoinCode,
        passcode: "NewPass456",
      });
    expect(rejoinC.status).toBe(200);
    expect(rejoinC.body.alreadyMember).toBe(false);

    // Update role for non-member user -> 404
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const updateGhostRes = await request(app)
      .patch(`/api/profiles/${createdProfileId}/members/${fakeUserId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({ role: "editor" });
    expect(updateGhostRes.status).toBe(404);

    // Remove non-member user -> 404
    const removeGhostRes = await request(app)
      .delete(`/api/profiles/${createdProfileId}/members/${fakeUserId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1");
    expect(removeGhostRes.status).toBe(404);

    // Sharing schema empty object -> 400
    const invalidSharing = await request(app)
      .patch(`/api/profiles/${createdProfileId}/sharing`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1")
      .send({});
    expect(invalidSharing.status).toBe(400);
  });

  it("DELETE /api/profiles/:id cascades deletion of profile and memberships", async () => {
    const deleteRes = await request(app)
      .delete(`/api/profiles/${createdProfileId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`)
      .set("X-Saath-CSRF", "1");

    expect(deleteRes.status).toBe(204);

    // Profile is gone
    const checkProfile = await ProfileModel.findById(createdProfileId);
    expect(checkProfile).toBeNull();

    // Memberships are gone
    const checkMemberships = await MembershipModel.find({ profileId: createdProfileId });
    expect(checkMemberships).toHaveLength(0);

    // Subsequent GET returns 404
    const getRes = await request(app)
      .get(`/api/profiles/${createdProfileId}`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${tokenA}`);

    expect(getRes.status).toBe(404);
  });
});
