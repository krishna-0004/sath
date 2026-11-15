import { describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";
import * as jose from "jose";
import { profileService } from "../src/services/profile.service.js";
import { medicineService } from "../src/services/medicine.service.js";
import { doseService } from "../src/services/dose.service.js";
import { appointmentService } from "../src/services/appointment.service.js";
import { verifyAccessToken } from "../src/services/token.service.js";
import { env } from "../src/config/env.js";
import { medicineRepository } from "../src/repositories/medicine.repository.js";
import { doseEventRepository } from "../src/repositories/dose-event.repository.js";
import { appointmentRepository } from "../src/repositories/appointment.repository.js";
import { profileRepository } from "../src/repositories/profile.repository.js";
import { membershipRepository } from "../src/repositories/membership.repository.js";
import type { ProfileDocument } from "../src/models/profile.model.js";
import type { MedicineDocument } from "../src/models/medicine.model.js";
import type { AppointmentDocument } from "../src/models/appointment.model.js";
import type { DoseEventDocument } from "../src/models/dose-event.model.js";
import type { MembershipDocument } from "../src/models/membership.model.js";

describe("Service Branch Coverage Edge Cases", () => {
  const fakeId = new mongoose.Types.ObjectId().toString();
  const fakeId2 = new mongoose.Types.ObjectId().toString();

  describe("TokenService branches", () => {
    it("rejects token with missing jti", async () => {
      const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
      const token = await new jose.SignJWT({ sub: "user-1", typ: "access" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("saath")
        .setAudience("saath-web")
        .setExpirationTime("15m")
        .sign(secret);

      await expect(verifyAccessToken(token)).rejects.toThrow("Invalid token identifier");
    });

    it("rejects token with invalid typ claim", async () => {
      const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
      const token = await new jose.SignJWT({ sub: "user-1", jti: "uuid-1", typ: "refresh" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("saath")
        .setAudience("saath-web")
        .setExpirationTime("15m")
        .sign(secret);

      await expect(verifyAccessToken(token)).rejects.toThrow("Invalid token type");
    });
  });

  describe("MedicineService branches", () => {
    it("throws NotFoundError when medicine profileId does not match in update", async () => {
      vi.spyOn(medicineRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as MedicineDocument);

      await expect(
        medicineService.updateMedicine(fakeId, fakeId, "user-1", { name: "New" }),
      ).rejects.toThrow("Medicine not found");
    });

    it("throws NotFoundError when update repository returns null", async () => {
      vi.spyOn(medicineRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId),
      } as unknown as MedicineDocument);
      vi.spyOn(medicineRepository, "update").mockResolvedValueOnce(null);

      await expect(
        medicineService.updateMedicine(fakeId, fakeId, "user-1", { name: "New" }),
      ).rejects.toThrow("Medicine not found");
    });

    it("throws NotFoundError when medicine profileId does not match in stop", async () => {
      vi.spyOn(medicineRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as MedicineDocument);

      await expect(medicineService.stopMedicine(fakeId, fakeId, "user-1")).rejects.toThrow(
        "Medicine not found",
      );
    });

    it("throws NotFoundError when markStopped repository returns null", async () => {
      vi.spyOn(medicineRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId),
      } as unknown as MedicineDocument);
      vi.spyOn(medicineRepository, "markStopped").mockResolvedValueOnce(null);

      await expect(medicineService.stopMedicine(fakeId, fakeId, "user-1")).rejects.toThrow(
        "Medicine not found",
      );
    });
  });

  describe("AppointmentService branches", () => {
    it("throws NotFoundError when appointment profileId does not match in update", async () => {
      vi.spyOn(appointmentRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as AppointmentDocument);

      await expect(
        appointmentService.updateAppointment(fakeId, fakeId, { title: "Doc" }),
      ).rejects.toThrow("Appointment not found");
    });

    it("throws NotFoundError when update returns null", async () => {
      vi.spyOn(appointmentRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId),
      } as unknown as AppointmentDocument);
      vi.spyOn(appointmentRepository, "update").mockResolvedValueOnce(null);

      await expect(
        appointmentService.updateAppointment(fakeId, fakeId, { title: "Doc" }),
      ).rejects.toThrow("Appointment not found");
    });

    it("throws NotFoundError when delete profileId does not match", async () => {
      vi.spyOn(appointmentRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as AppointmentDocument);

      await expect(appointmentService.deleteAppointment(fakeId, fakeId)).rejects.toThrow(
        "Appointment not found",
      );
    });
  });

  describe("DoseService branches", () => {
    it("handles zero accountable doses with 100% adherence and pending future dose", async () => {
      const mockProfile = {
        id: fakeId,
        timezone: "Asia/Kolkata",
      } as unknown as ProfileDocument;

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 5);
      vi.spyOn(doseEventRepository, "findByProfileAndDateRange").mockResolvedValueOnce([
        {
          id: fakeId,
          status: "pending",
          scheduledFor: futureDate,
        } as unknown as DoseEventDocument,
      ]);

      const summary = await doseService.getSummary(mockProfile, 7);
      expect(summary.total).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.adherenceRate).toBe(100);
    });

    it("throws NotFoundError when dose profileId does not match in recordDose", async () => {
      vi.spyOn(doseEventRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as DoseEventDocument);

      await expect(
        doseService.recordDose(fakeId, fakeId, "user-1", { status: "taken" }),
      ).rejects.toThrow("Dose event not found");
    });

    it("throws NotFoundError when updateStatus returns null", async () => {
      vi.spyOn(doseEventRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        profileId: new mongoose.Types.ObjectId(fakeId),
      } as unknown as DoseEventDocument);
      vi.spyOn(doseEventRepository, "updateStatus").mockResolvedValueOnce(null);

      await expect(
        doseService.recordDose(fakeId, fakeId, "user-1", { status: "taken" }),
      ).rejects.toThrow("Dose event not found");
    });
  });

  describe("ProfileService branches", () => {
    it("throws NotFoundError on non-existent profile operations", async () => {
      vi.spyOn(profileRepository, "findById").mockResolvedValue(null);
      vi.spyOn(profileRepository, "update").mockResolvedValue(null);

      await expect(profileService.getProfileById(fakeId)).rejects.toThrow("Profile not found");
      await expect(profileService.updateProfile(fakeId, { displayName: "New" })).rejects.toThrow(
        "Profile not found",
      );
      await expect(
        profileService.updateSharing(fakeId, "user-1", { medicines: true }),
      ).rejects.toThrow("Profile not found");
    });

    it("throws NotFoundError when updateSharing repository update returns null", async () => {
      vi.spyOn(profileRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
        sharing: { medicines: true, reports: true, appointments: true },
      } as unknown as ProfileDocument);
      vi.spyOn(profileRepository, "update").mockResolvedValueOnce(null);

      await expect(
        profileService.updateSharing(fakeId, "user-1", { medicines: true }),
      ).rejects.toThrow("Profile not found");
    });

    it("throws NotFoundError when rotatePasscode repository update returns null", async () => {
      vi.spyOn(profileRepository, "findById").mockResolvedValueOnce({
        id: fakeId,
      } as unknown as ProfileDocument);
      vi.spyOn(profileRepository, "updatePasscode").mockResolvedValueOnce(null);

      await expect(profileService.rotatePasscode(fakeId, "NewPass123", "user-1")).rejects.toThrow(
        "Profile not found",
      );
    });

    it("throws NotFoundError when updateMemberRole repository returns null", async () => {
      vi.spyOn(membershipRepository, "findActiveByProfileAndUser").mockResolvedValueOnce({
        id: fakeId,
        role: "editor",
      } as unknown as MembershipDocument);
      vi.spyOn(membershipRepository, "updateRole").mockResolvedValueOnce(null);

      await expect(
        profileService.updateMemberRole(fakeId, fakeId2, "viewer", "user-1"),
      ).rejects.toThrow("Member not found in profile");
    });
  });
});
