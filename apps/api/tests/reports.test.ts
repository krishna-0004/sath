import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/models/user.model.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { aiClientService } from "../src/services/ai-client.service.js";
import { uploadService } from "../src/services/upload.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Phase 2 Step 7 Report Lens & What Changed Feed", () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;
  let elderToken: string;
  let editorToken: string;
  let viewerToken: string;
  let profileId: string;
  let createdReportId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    const elder = await UserModel.create({
      googleId: "google-rep-elder",
      email: "elder-reports@saath.local",
      name: "Elder Reports",
      isDemo: false,
    });
    const editor = await UserModel.create({
      googleId: "google-rep-editor",
      email: "editor-reports@saath.local",
      name: "Editor Reports",
      isDemo: false,
    });
    const viewer = await UserModel.create({
      googleId: "google-rep-viewer",
      email: "viewer-reports@saath.local",
      name: "Viewer Reports",
      isDemo: false,
    });

    elderToken = await signAccessToken(elder.id);
    editorToken = await signAccessToken(editor.id);
    viewerToken = await signAccessToken(viewer.id);

    const profile = await ProfileModel.create({
      elderName: "Mother Kamala",
      displayName: "Mother Kamala",
      timezone: "Asia/Kolkata",
      joinCode: "REPORT0001",
      passcodeHash: "hash-report",
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

  describe("Report Preview & Creation", () => {
    it("POST /api/profiles/:id/reports/preview extracts lab report via AI", async () => {
      vi.spyOn(uploadService, "getMockAsset").mockReturnValueOnce({
        uploadId: "mock-rep-upload",
        buffer: Buffer.from("test"),
        fileType: "image/png",
        bytes: 4,
      });

      vi.spyOn(aiClientService, "extractLabReport").mockResolvedValueOnce({
        testName: "Glycated Hemoglobin Panel",
        collectedAtText: "10/10/2026",
        metrics: [
          {
            name: "HbA1c",
            value: 6.8,
            unit: "%",
            referenceRangeText: "4.0 - 5.6",
            flag: "high",
          },
        ],
        rawNotes: "Ask the doctor about this.",
      });

      const res = await request(app)
        .post(`/api/profiles/${profileId}/reports/preview`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ uploadId: "mock-rep-upload" });

      expect(res.status).toBe(200);
      expect(res.body.testName).toBe("Glycated Hemoglobin Panel");
      expect(res.body.metrics[0].flag).toBe("high");
    });

    it("POST /api/profiles/:id/reports creates confirmed report (elder/editor)", async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/reports`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          title: "HbA1c Blood Test (Oct 2026)",
          testDate: "2026-10-10T08:00:00.000Z",
          labName: "Apollo Diagnostics",
          metrics: [
            {
              name: "HbA1c",
              value: 6.8,
              unit: "%",
              referenceRangeText: "4.0 - 5.6",
              flag: "high",
            },
            {
              name: "Fasting Glucose",
              value: 110,
              unit: "mg/dL",
              referenceRangeText: "70 - 99",
              flag: "high",
            },
          ],
          notes: "Transcribed verbatim. Ask the doctor about this.",
        });

      expect(res.status).toBe(201);
      expect(res.body.report.id).toBeDefined();
      expect(res.body.report.title).toBe("HbA1c Blood Test (Oct 2026)");
      createdReportId = res.body.report.id;

      // Create a second report 30 days later to test comparison
      await request(app)
        .post(`/api/profiles/${profileId}/reports`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          title: "HbA1c Blood Test (Nov 2026)",
          testDate: "2026-11-10T08:00:00.000Z",
          labName: "Apollo Diagnostics",
          metrics: [
            {
              name: "HbA1c",
              value: 6.4,
              unit: "%",
              referenceRangeText: "4.0 - 5.6",
              flag: "high",
            },
            {
              name: "Fasting Glucose",
              value: 95,
              unit: "mg/dL",
              referenceRangeText: "70 - 99",
              flag: "normal",
            },
          ],
        });
    });
  });

  describe("Report Retrieval, Comparison & Rule 9", () => {
    it("GET /api/profiles/:id/reports lists reports and respects category sharing", async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/reports`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(2);

      // Disable report sharing for viewers
      await ProfileModel.findByIdAndUpdate(profileId, { "sharing.reports": false });

      const blockedRes = await request(app)
        .get(`/api/profiles/${profileId}/reports`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`);
      expect(blockedRes.status).toBe(404);

      // Restore sharing
      await ProfileModel.findByIdAndUpdate(profileId, { "sharing.reports": true });
    });

    it("GET /api/profiles/:id/reports/:reportId returns single report", async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/reports/${createdReportId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.report.id).toBe(createdReportId);
    });

    it("GET /api/profiles/:id/reports/compare computes deterministic diff with neutral wording", async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/reports/compare?metricName=HbA1c`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metricName).toBe("HbA1c");
      expect(res.body.history).toHaveLength(2);

      const first = res.body.history[0];
      const second = res.body.history[1];

      expect(first.diff.text).toBe("no prior test");

      // Numerical diff from 6.8 to 6.4 = -0.4
      expect(second.diff.absolute).toBe(-0.4);
      expect(second.diff.daysBetween).toBeGreaterThanOrEqual(30);
      expect(second.diff.text).toContain("changed by -0.4 %");

      // CRITICAL HARD RULE 9: No judgment words!
      const allText = JSON.stringify(res.body);
      const forbiddenWords = ["improved", "worsened", "better", "worse", "good", "bad", "alarming"];
      for (const word of forbiddenWords) {
        expect(allText.toLowerCase()).not.toContain(` ${word} `);
      }
    });

    it("DELETE /api/profiles/:id/reports/:reportId is elder-only", async () => {
      // Editor blocked
      const editorRes = await request(app)
        .delete(`/api/profiles/${profileId}/reports/${createdReportId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1");
      expect(editorRes.status).toBe(403);

      // Elder succeeds
      const elderRes = await request(app)
        .delete(`/api/profiles/${profileId}/reports/${createdReportId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1");
      expect(elderRes.status).toBe(204);
    });
  });
});
