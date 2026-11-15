import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { JoinAttemptModel } from "../src/models/join-attempt.model.js";
import { MedicineModel } from "../src/models/medicine.model.js";
import { DoseEventModel } from "../src/models/dose-event.model.js";
import { AppointmentModel } from "../src/models/appointment.model.js";
import { DoctorContactModel } from "../src/models/doctor-contact.model.js";
import { profileRepository } from "../src/repositories/profile.repository.js";
import { membershipRepository } from "../src/repositories/membership.repository.js";
import { joinAttemptRepository } from "../src/repositories/join-attempt.repository.js";
import { medicineRepository } from "../src/repositories/medicine.repository.js";
import { doseEventRepository } from "../src/repositories/dose-event.repository.js";
import { appointmentRepository } from "../src/repositories/appointment.repository.js";
import { doctorContactRepository } from "../src/repositories/doctor-contact.repository.js";

describe("Phase 2 Care Core Models & Repositories", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    await Promise.all([
      ProfileModel.syncIndexes(),
      MembershipModel.syncIndexes(),
      JoinAttemptModel.syncIndexes(),
      MedicineModel.syncIndexes(),
      DoseEventModel.syncIndexes(),
      AppointmentModel.syncIndexes(),
      DoctorContactModel.syncIndexes(),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("Profile repository & model", () => {
    it("creates a profile and ensures passcodeHash is omitted in toJSON", async () => {
      const creatorId = new mongoose.Types.ObjectId().toString();
      const profile = await profileRepository.create({
        elderName: "Grandpa Ramesh",
        joinCode: "ABC234DEF7",
        passcodeHash: "$2a$12$hashedpasscode",
        emergencyPhone: "+919876543210",
        createdBy: creatorId,
      });

      expect(profile._id).toBeDefined();
      expect(profile.elderName).toBe("Grandpa Ramesh");
      expect(profile.joinCode).toBe("ABC234DEF7");
      expect(profile.sharing.medicines).toBe(true);

      const json = profile.toJSON();
      expect(json.id).toBe(profile._id.toString());
      expect(json).not.toHaveProperty("passcodeHash");
      expect(json).not.toHaveProperty("_id");
      expect(json).not.toHaveProperty("__v");

      const found = await profileRepository.findByJoinCode("abc234def7");
      expect(found).not.toBeNull();
      expect(found?.elderName).toBe("Grandpa Ramesh");
    });
  });

  describe("Membership repository", () => {
    it("creates active membership, promotes role and revokes", async () => {
      const pId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();

      const membership = await membershipRepository.create({
        profileId: pId,
        userId: uId,
        role: "viewer",
      });

      expect(membership.role).toBe("viewer");
      expect(membership.status).toBe("active");

      const updated = await membershipRepository.updateRole(pId, uId, "editor");
      expect(updated?.role).toBe("editor");

      const revoked = await membershipRepository.revoke(pId, uId);
      expect(revoked?.status).toBe("revoked");

      const active = await membershipRepository.findActiveByProfileAndUser(pId, uId);
      expect(active).toBeNull();
    });
  });

  describe("JoinAttempt repository & lockout", () => {
    it("tracks failed attempts and locks after 5 failures", async () => {
      const uId = new mongoose.Types.ObjectId().toString();
      const code = "JOIN999XYZ";

      for (let i = 1; i <= 4; i++) {
        const res = await joinAttemptRepository.recordFailure(uId, code);
        expect(res.count).toBe(i);
        expect(res.locked).toBe(false);
      }

      const lockedRes = await joinAttemptRepository.recordFailure(uId, code);
      expect(lockedRes.count).toBe(5);
      expect(lockedRes.locked).toBe(true);
      expect(lockedRes.lockedUntil).not.toBeNull();

      const isLocked = await joinAttemptRepository.isLocked(uId, code);
      expect(isLocked).toBe(true);

      await joinAttemptRepository.resetAttempt(uId, code);
      const isLockedAfterReset = await joinAttemptRepository.isLocked(uId, code);
      expect(isLockedAfterReset).toBe(false);
    });
  });

  describe("Medicine and DoseEvent repositories", () => {
    it("creates medicines and bulk upserts idempotent dose events", async () => {
      const pId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();

      const med = await medicineRepository.create({
        profileId: pId,
        name: "Metformin",
        strengthText: "500 mg",
        frequencyText: "Twice daily after meals",
        anchors: ["breakfast", "dinner"],
        withFood: "after",
        notes: "Take with full glass of water",
        createdBy: uId,
        updatedBy: uId,
      });

      expect(med.name).toBe("Metformin");
      expect(med.anchors).toEqual(["breakfast", "dinner"]);

      const medId = med._id.toString();
      const scheduledMorning = new Date("2026-11-15T08:00:00Z");
      const scheduledNight = new Date("2026-11-15T20:00:00Z");

      await doseEventRepository.bulkUpsertPending([
        { profileId: pId, medicineId: medId, scheduledFor: scheduledMorning },
        { profileId: pId, medicineId: medId, scheduledFor: scheduledNight },
      ]);

      // Re-running does not duplicate or overwrite
      await doseEventRepository.bulkUpsertPending([
        { profileId: pId, medicineId: medId, scheduledFor: scheduledMorning },
      ]);

      const start = new Date("2026-11-15T00:00:00Z");
      const end = new Date("2026-11-15T23:59:59Z");
      const doses = await doseEventRepository.findByProfileAndDateRange(pId, start, end);
      expect(doses).toHaveLength(2);

      const firstDose = doses[0];
      const doseId = firstDose!._id.toString();
      const taken = await doseEventRepository.updateStatus(doseId, "taken", uId);
      expect(taken?.status).toBe("taken");
      expect(taken?.recordedBy?.toString()).toBe(uId);
    });
  });

  describe("Appointment and DoctorContact repositories", () => {
    it("creates appointments and contacts and queries active records", async () => {
      const pId = new mongoose.Types.ObjectId().toString();
      const uId = new mongoose.Types.ObjectId().toString();

      const apt = await appointmentRepository.create({
        profileId: pId,
        title: "Cardiologist Consultation",
        doctorName: "Dr. K. Sharma",
        location: "Apollo Clinic, Bengaluru",
        startsAt: new Date(Date.now() + 86400000),
        notes: "Carry previous ECG and blood panel",
        createdBy: uId,
      });

      expect(apt.title).toBe("Cardiologist Consultation");

      const contact = await doctorContactRepository.create({
        profileId: pId,
        kind: "family_doctor",
        name: "Dr. K. Sharma",
        email: "dr.sharma@example.com",
        whatsappNumber: "+919876543210",
        consentRecordedAt: new Date(),
        consentBy: uId,
      });

      expect(contact.kind).toBe("family_doctor");

      const activeContacts = await doctorContactRepository.findActiveByProfile(pId);
      expect(activeContacts).toHaveLength(1);

      await doctorContactRepository.revoke(contact._id.toString());
      const remainingContacts = await doctorContactRepository.findActiveByProfile(pId);
      expect(remainingContacts).toHaveLength(0);
    });
  });
});
