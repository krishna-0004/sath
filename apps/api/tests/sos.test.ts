import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { UserModel } from "../src/models/user.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { MedicineModel } from "../src/models/medicine.model.js";
import { DoctorContactModel } from "../src/models/doctor-contact.model.js";
import { ReportModel } from "../src/models/report.model.js";
import { ShareLinkModel } from "../src/models/share-link.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";
import type { Express } from "express";

describe("Emergency SOS & Public ShareLink Flow (Steps 9 & 10)", () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  const elderUserId = new mongoose.Types.ObjectId().toString();
  const profileId = new mongoose.Types.ObjectId().toString();
  let elderToken: string;
  let generatedShareToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    await UserModel.create({
      _id: elderUserId,
      googleId: `google-elder-${elderUserId}`,
      email: "elder-sos@saath.invalid",
      name: "Elder Sos",
      isDemo: false,
    });

    await ProfileModel.create({
      _id: profileId,
      elderName: "Dad Sharma",
      passcodeHash: "$2a$12$eXampleHashedPasscodeForTestingOnly1234567890",
      joinCode: "SOS1234567",
      timezone: "Asia/Kolkata",
      emergencyPhone: "+919876543210",
      sharing: { medicines: true, reports: true, appointments: true },
      createdBy: elderUserId,
    });

    await MembershipModel.create({
      profileId,
      userId: elderUserId,
      role: "elder",
      status: "active",
      joinedAt: new Date(),
    });

    await MedicineModel.create({
      profileId,
      name: "Amlodipine",
      strengthText: "5mg",
      frequencyText: "Once daily",
      anchors: ["breakfast"],
      withFood: "with",
      status: "active",
      source: "manual",
      createdBy: elderUserId,
      updatedBy: elderUserId,
    });

    await DoctorContactModel.create({
      profileId,
      name: "Dr. Arvind Mehta",
      kind: "emergency_doctor",
      email: "dr.mehta@hospital.invalid",
      whatsappNumber: "+919988776655",
      consentRecordedAt: new Date(),
      consentBy: elderUserId,
    });

    await ReportModel.create({
      profileId,
      title: "Comprehensive Metabolic Panel",
      testDate: new Date(),
      metrics: [{ name: "HbA1c", value: "6.2", unit: "%", flag: "normal" }],
      createdBy: elderUserId,
    });

    elderToken = await signAccessToken(elderUserId);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("POST /api/profiles/:id/sos triggers emergency alert, returns whatsapp link and shareToken", async () => {
    const res = await request(app)
      .post(`/api/profiles/${profileId}/sos`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
      .set("X-Saath-CSRF", "1")
      .send({
        locationText: "Home - Block B, Apartment 402",
      });

    expect(res.status).toBe(200);
    expect(res.body.elderName).toBe("Dad Sharma");
    expect(res.body.emergencyPhone).toBe("+919876543210");
    expect(res.body.doctorContactsNotified).toBe(1);
    expect(res.body.whatsappLinks).toHaveLength(1);
    expect(res.body.whatsappLinks[0].whatsappUrl).toContain("wa.me/919988776655");
    expect(res.body.shareToken).toBeDefined();

    generatedShareToken = res.body.shareToken;
  });

  it("GET /api/share/:token returns public emergency medical summary without login", async () => {
    const res = await request(app).get(`/api/share/${generatedShareToken}`);

    expect(res.status).toBe(200);
    expect(res.body.elderName).toBe("Dad Sharma");
    expect(res.body.emergencyPhone).toBe("+919876543210");
    expect(res.body.medicines).toHaveLength(1);
    expect(res.body.medicines[0].name).toBe("Amlodipine");
    expect(res.body.doctorContacts).toHaveLength(1);
    expect(res.body.doctorContacts[0].name).toBe("Dr. Arvind Mehta");
    expect(res.body.recentReports).toHaveLength(1);
    expect(res.body.recentReports[0].metrics).toHaveLength(1);
    expect(res.body.recentReports[0].metrics[0].name).toBe("HbA1c");
  });

  it("GET /api/share/:token returns 404 for invalid or expired token", async () => {
    const res = await request(app).get("/api/share/non-existent-token-123");
    expect(res.status).toBe(404);
  });

  it("GET /api/share/:token returns 404 when profile no longer exists", async () => {
    const orphanToken = "orphan-token-123456789";
    const nonExistentProfileId = new mongoose.Types.ObjectId().toString();
    await ShareLinkModel.create({
      profileId: nonExistentProfileId,
      token: orphanToken,
      scope: "emergency",
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: elderUserId,
    });

    const res = await request(app).get(`/api/share/${orphanToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("POST /api/profiles/:id/sos handles profile with null emergency phone and no doctor contacts", async () => {
    const emptyProfileId = new mongoose.Types.ObjectId().toString();
    await ProfileModel.create({
      _id: emptyProfileId,
      elderName: "Solo Elder",
      passcodeHash: "$2a$12$eXampleHashedPasscodeForTestingOnly1234567890",
      joinCode: "SOLO123456",
      timezone: "Asia/Kolkata",
      emergencyPhone: null,
      sharing: { medicines: true, reports: true, appointments: true },
      createdBy: elderUserId,
    });
    await MembershipModel.create({
      profileId: emptyProfileId,
      userId: elderUserId,
      role: "elder",
      status: "active",
      joinedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/profiles/${emptyProfileId}/sos`)
      .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
      .set("X-Saath-CSRF", "1")
      .send({ locationText: "City Park" });

    expect(res.status).toBe(200);
    expect(res.body.emergencyPhone).toBeNull();
    expect(res.body.doctorContactsNotified).toBe(0);
    expect(res.body.whatsappLinks).toHaveLength(0);
  });
});
