import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/models/user.model.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { uploadService } from "../src/services/upload.service.js";
import { aiClientService } from "../src/services/ai-client.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Phase 2 Step 5 Upload and AI Extraction Orchestration", () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;
  let elderToken: string;
  let editorToken: string;
  let viewerToken: string;
  let profileId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    const elder = await UserModel.create({
      googleId: "google-elder-upl",
      email: "elder-upload@saath.local",
      name: "Elder Uploader",
      isDemo: false,
    });
    const editor = await UserModel.create({
      googleId: "google-editor-upl",
      email: "editor-upload@saath.local",
      name: "Editor Uploader",
      isDemo: false,
    });
    const viewer = await UserModel.create({
      googleId: "google-viewer-upl",
      email: "viewer-upload@saath.local",
      name: "Viewer Uploader",
      isDemo: false,
    });

    elderToken = await signAccessToken(elder.id);
    editorToken = await signAccessToken(editor.id);
    viewerToken = await signAccessToken(viewer.id);

    const profile = await ProfileModel.create({
      elderName: "Grandma Lakshmi",
      displayName: "Grandma Lakshmi",
      timezone: "Asia/Kolkata",
      joinCode: "TESTUPL001",
      passcodeHash: "hash123",
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("Upload Validation and Storage", () => {
    it("rejects request without a file (400)", async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/uploads/prescription-or-report`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unsupported media type (415)", async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/uploads/prescription-or-report`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .attach("file", Buffer.from("plain text content"), {
          filename: "test.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(415);
      expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });

    it("rejects files exceeding 10MB (413)", () => {
      expect(() => {
        uploadService.validateFile({
          mimetype: "image/png",
          size: 11 * 1024 * 1024,
        });
      }).toThrowError(/exceeds 10MB limit/);
    });

    it("blocks viewer role from uploading (403)", async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/uploads/prescription-or-report`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`)
        .set("X-Saath-CSRF", "1")
        .attach("file", Buffer.from("fake-png"), {
          filename: "test.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(403);
    });

    it("accepts valid image and returns privateUrl (201)", async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = await request(app)
        .post(`/api/profiles/${profileId}/uploads/prescription-or-report`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .attach("file", pngBuffer, {
          filename: "prescription.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.uploadId).toBeDefined();
      expect(res.body.privateUrl).toBeDefined();
      expect(res.body.fileType).toBe("image/png");

      // Verify mock download route works
      const downloadRes = await request(app).get(`/api/mock-uploads/${res.body.uploadId}`);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers["content-type"]).toContain("image/png");
    });
  });

  describe("AI Client Service HTTP Orchestration", () => {
    it("calls AI service and parses prescription response", async () => {
      const mockResult = {
        medicines: [
          {
            name: "Metformin",
            strengthText: "500mg",
            frequencyText: "twice daily",
            anchors: ["breakfast", "dinner"],
            withFood: true,
            instructions: "Take with food",
          },
        ],
        rawDoctorNotes: "Transcribed verbatim. Ask the doctor about this.",
        rawDateText: "10/11/2026",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      } as unknown as Response);

      const result = await aiClientService.extractPrescription({
        imageUrl: "http://example.com/test.png",
      });

      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0]!.name).toBe("Metformin");
    });

    it("calls AI service and parses lab report response", async () => {
      const mockResult = {
        testName: "Blood Chemistry",
        collectedAtText: "10/11/2026",
        metrics: [
          {
            name: "HbA1c",
            value: 6.2,
            unit: "%",
            referenceRangeText: "4.0 - 5.6",
            flag: "high",
          },
        ],
        rawNotes: "Ask the doctor about this.",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      } as unknown as Response);

      const result = await aiClientService.extractLabReport({
        imageUrl: "http://example.com/report.png",
      });

      expect(result.testName).toBe("Blood Chemistry");
      expect(result.metrics[0]!.flag).toBe("high");
    });

    it("retries on 503 and translates error", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ error: { code: "SERVICE_UNAVAILABLE", message: "AI cold start" } }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ medicines: [], rawDoctorNotes: "", rawDateText: null }),
        } as unknown as Response);

      const result = await aiClientService.extractPrescription({
        base64Data: "abc",
      });
      expect(result.medicines).toEqual([]);
    });
  });
});
