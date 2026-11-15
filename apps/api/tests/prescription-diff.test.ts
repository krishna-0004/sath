import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/models/user.model.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { MedicineModel } from "../src/models/medicine.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { aiClientService } from "../src/services/ai-client.service.js";
import { uploadService } from "../src/services/upload.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Phase 2 Step 6 Prescription Scan & Confirm Deterministic Diff", () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;
  let elderToken: string;
  let editorToken: string;
  let viewerToken: string;
  let strangerToken: string;
  let profileId: string;
  let metforminId: string;
  let amlodipineId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    const elder = await UserModel.create({
      googleId: "google-diff-elder",
      email: "elder-diff@saath.local",
      name: "Elder Diff",
      isDemo: false,
    });
    const editor = await UserModel.create({
      googleId: "google-diff-editor",
      email: "editor-diff@saath.local",
      name: "Editor Diff",
      isDemo: false,
    });
    const viewer = await UserModel.create({
      googleId: "google-diff-viewer",
      email: "viewer-diff@saath.local",
      name: "Viewer Diff",
      isDemo: false,
    });
    const stranger = await UserModel.create({
      googleId: "google-diff-stranger",
      email: "stranger-diff@saath.local",
      name: "Stranger Diff",
      isDemo: false,
    });

    elderToken = await signAccessToken(elder.id);
    editorToken = await signAccessToken(editor.id);
    viewerToken = await signAccessToken(viewer.id);
    strangerToken = await signAccessToken(stranger.id);

    const profile = await ProfileModel.create({
      elderName: "Father Raman",
      displayName: "Father Raman",
      timezone: "Asia/Kolkata",
      joinCode: "DIFFTEST01",
      passcodeHash: "hash-diff",
      sharing: { medicines: true, reports: true, appointments: true },
      createdBy: elder._id,
    });
    profileId = profile.id;

    await MembershipModel.create({
      profileId: profile._id,
      userId: elder._id,
      role: "elder",
      status: "active",
    });
    await MembershipModel.create({
      profileId: profile._id,
      userId: editor._id,
      role: "editor",
      status: "active",
    });
    await MembershipModel.create({
      profileId: profile._id,
      userId: viewer._id,
      role: "viewer",
      status: "active",
    });

    // Seed existing active medicines
    const met = await MedicineModel.create({
      profileId: profile._id,
      name: "Metformin",
      strengthText: "500mg",
      frequencyText: "twice daily",
      anchors: ["breakfast", "dinner"],
      withFood: "with",
      notes: "Take with meals",
      status: "active",
      source: "manual",
      createdBy: elder._id,
      updatedBy: elder._id,
    });
    metforminId = met.id;

    const aml = await MedicineModel.create({
      profileId: profile._id,
      name: "Amlodipine",
      strengthText: "5mg",
      frequencyText: "once daily",
      anchors: ["breakfast"],
      withFood: null,
      notes: "",
      status: "active",
      source: "manual",
      createdBy: elder._id,
      updatedBy: elder._id,
    });
    amlodipineId = aml.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("Prescription Preview & Deterministic Diff", () => {
    it("computes added, updated, unchanged, and possiblyDiscontinued diff without mutating DB", async () => {
      // Mock upload asset
      vi.spyOn(uploadService, "getMockAsset").mockReturnValueOnce({
        uploadId: "mock-upload-123",
        buffer: Buffer.from("test"),
        fileType: "image/png",
        bytes: 4,
      });

      // Mock AI extraction: Metformin (dose increased to 1000mg), Atorvastatin (new), Amlodipine omitted
      vi.spyOn(aiClientService, "extractPrescription").mockResolvedValueOnce({
        medicines: [
          {
            name: "Metformin",
            strengthText: "1000mg",
            frequencyText: "twice daily",
            anchors: ["breakfast", "dinner"],
            withFood: "with",
            instructions: "Take with food",
          },
          {
            name: "Atorvastatin",
            strengthText: "20mg",
            frequencyText: "once daily",
            anchors: ["bedtime"],
            withFood: null,
            instructions: "Take at bedtime",
          },
        ],
        rawDoctorNotes: "Blood pressure controlled. Ask the doctor about this.",
        rawDateText: "15/11/2026",
      });

      const res = await request(app)
        .post(`/api/profiles/${profileId}/scan/prescription/preview`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ uploadId: "mock-upload-123" });

      expect(res.status).toBe(200);
      expect(res.body.diff).toBeDefined();

      const { added, updated, unchanged, possiblyDiscontinued } = res.body.diff;
      expect(added).toHaveLength(1);
      expect(added[0].name).toBe("Atorvastatin");

      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe("Metformin");
      expect(updated[0].strengthText).toBe("1000mg");

      expect(unchanged).toHaveLength(0);

      expect(possiblyDiscontinued).toHaveLength(1);
      expect(possiblyDiscontinued[0].name).toBe("Amlodipine");
      expect(possiblyDiscontinued[0].id).toBe(amlodipineId);

      expect(res.body.rawDoctorNotes).toContain("Ask the doctor about this");

      // Verify DB was NOT mutated yet
      const currentMet = await MedicineModel.findById(metforminId);
      expect(currentMet?.strengthText).toBe("500mg");
    });

    it("blocks viewer and stranger from previewing", async () => {
      const viewerRes = await request(app)
        .post(`/api/profiles/${profileId}/scan/prescription/preview`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ uploadId: "fake-id" });
      expect(viewerRes.status).toBe(403);

      const strangerRes = await request(app)
        .post(`/api/profiles/${profileId}/scan/prescription/preview`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${strangerToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ uploadId: "fake-id" });
      expect(strangerRes.status).toBe(404);
    });
  });

  describe("Prescription Confirm & Mutation", () => {
    it("applies elder-confirmed changes to DB with audit events", async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/scan/prescription/confirm`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          applyAdded: [
            {
              name: "Atorvastatin",
              strengthText: "20mg",
              frequencyText: "once daily",
              anchors: ["bedtime"],
              withFood: null,
              instructions: "Take at bedtime",
            },
          ],
          applyUpdated: [
            {
              id: metforminId,
              name: "Metformin",
              strengthText: "1000mg",
              frequencyText: "twice daily",
              anchors: ["breakfast", "dinner"],
              withFood: "with",
              instructions: "Take with food",
            },
          ],
          stopDiscontinuedIds: [amlodipineId],
        });

      expect(res.status).toBe(200);
      expect(res.body.applied.added).toBe(1);
      expect(res.body.applied.updated).toBe(1);
      expect(res.body.applied.stopped).toBe(1);

      // Verify DB mutations
      const updatedMet = await MedicineModel.findById(metforminId);
      expect(updatedMet?.strengthText).toBe("1000mg");
      expect(updatedMet?.source).toBe("scan");

      const stoppedAml = await MedicineModel.findById(amlodipineId);
      expect(stoppedAml?.status).toBe("stopped");

      const createdAtor = await MedicineModel.findOne({
        profileId,
        name: "Atorvastatin",
      });
      expect(createdAtor).toBeDefined();
      expect(createdAtor?.source).toBe("scan");
    });
  });
});
