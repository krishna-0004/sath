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
import { uploadService } from "../src/services/upload.service.js";
import { reportService } from "../src/services/report.service.js";
import { reportRepository } from "../src/repositories/report.repository.js";
import { prescriptionDiffService } from "../src/services/prescription-diff.service.js";
import { aiClientService } from "../src/services/ai-client.service.js";
import type { ProfileDocument } from "../src/models/profile.model.js";
import type { MedicineDocument } from "../src/models/medicine.model.js";
import type { AppointmentDocument } from "../src/models/appointment.model.js";
import type { DoseEventDocument } from "../src/models/dose-event.model.js";
import type { MembershipDocument } from "../src/models/membership.model.js";
import type { ReportDocument } from "../src/models/report.model.js";

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

  describe("UploadService branches", () => {
    it("validates missing file, invalid mime, and oversized payload", () => {
      expect(() => uploadService.validateFile(undefined)).toThrow("No file provided");
      expect(() => uploadService.validateFile({ mimetype: "video/mp4", size: 100 })).toThrow(
        "Unsupported media type",
      );
      expect(() =>
        uploadService.validateFile({ mimetype: "image/jpeg", size: 11 * 1024 * 1024 }),
      ).toThrow("File size exceeds 10MB limit");
    });

    it("throws NotFoundError when mock asset is not found", () => {
      expect(() => uploadService.getMockAsset("missing-upload-id")).toThrow("Upload not found");
    });
  });

  describe("ReportService branches", () => {
    it("throws NotFoundError in deleteReport when report does not exist or profile mismatches", async () => {
      vi.spyOn(reportRepository, "findById").mockResolvedValueOnce(null);
      await expect(reportService.deleteReport(fakeId, fakeId2, "user-1")).rejects.toThrow(
        "Report not found",
      );

      vi.spyOn(reportRepository, "findById").mockResolvedValueOnce({
        id: fakeId2,
        profileId: new mongoose.Types.ObjectId(fakeId2), // different from fakeId
      } as unknown as ReportDocument);
      await expect(reportService.deleteReport(fakeId, fakeId2, "user-1")).rejects.toThrow(
        "Report not found",
      );
    });

    it("throws NotFoundError in getReportById when profile mismatches", async () => {
      vi.spyOn(reportRepository, "findById").mockResolvedValueOnce({
        id: fakeId2,
        profileId: new mongoose.Types.ObjectId(fakeId2),
      } as unknown as ReportDocument);
      await expect(reportService.getReportById(fakeId, fakeId2)).rejects.toThrow(
        "Report not found",
      );
    });

    it("handles compareMetric edge cases: empty history, zero previous value, and non-numeric value", async () => {
      // Empty history
      vi.spyOn(reportRepository, "findMetricHistory").mockResolvedValueOnce([]);
      const emptyRes = await reportService.compareMetric(fakeId, "HbA1c");
      expect(emptyRes.history).toHaveLength(0);

      // Non-numeric value and zero previous
      const rep1 = {
        testDate: new Date("2026-01-01"),
        metrics: [{ name: "Biomarker", value: 0, unit: "mg/dL", flag: "normal" }],
      } as unknown as ReportDocument;
      const rep2 = {
        testDate: new Date("2026-02-01"),
        metrics: [{ name: "Biomarker", value: "Positive", unit: "", flag: "high" }],
      } as unknown as ReportDocument;

      vi.spyOn(reportRepository, "findMetricHistory").mockResolvedValueOnce([rep1, rep2]);
      const nonNumRes = await reportService.compareMetric(fakeId, "Biomarker");
      expect(nonNumRes.history).toHaveLength(2);
      expect(nonNumRes.history[1]?.diff.text).toBe("qualitative or non-numeric metric");
    });
  });

  describe("PrescriptionDiffService branches", () => {
    it("handles variations in extraction anchors and frequency changes", async () => {
      vi.spyOn(uploadService, "getMockAsset").mockReturnValueOnce({
        uploadId: "mock-1",
        buffer: Buffer.from("test"),
        fileType: "application/pdf",
        bytes: 4,
      });

      vi.spyOn(aiClientService, "extractPrescription").mockResolvedValueOnce({
        medicines: [
          {
            name: "Metformin",
            strengthText: "1000mg", // changed
            frequencyText: "Twice daily",
            anchors: ["breakfast", "invalid_anchor"],
            withFood: false,
            instructions: "Take with food",
          },
          {
            name: "Aspirin",
            strengthText: "75mg",
            frequencyText: "Once daily",
            anchors: ["breakfast"],
            withFood: "with",
            instructions: "Morning",
          },
        ],
        rawDoctorNotes: "Notes",
        rawDateText: null,
      });

      vi.spyOn(medicineRepository, "findActiveByProfile").mockResolvedValueOnce([
        {
          id: fakeId,
          name: "Metformin",
          strengthText: "500mg",
          frequencyText: "Twice daily",
          anchors: ["breakfast"],
          withFood: "with",
          notes: "Old notes",
        } as unknown as MedicineDocument,
        {
          id: fakeId2,
          name: "Aspirin",
          strengthText: "75mg",
          frequencyText: "Once daily",
          anchors: ["breakfast"],
          withFood: "with",
          notes: "Morning",
        } as unknown as MedicineDocument,
      ]);

      const res = await prescriptionDiffService.previewPrescription(fakeId, "mock-1");
      expect(res.diff.updated).toHaveLength(1);
      expect(res.diff.unchanged).toHaveLength(1);
      expect(res.diff.updated[0]?.strengthText).toBe("1000mg");
    });

    it("handles confirmPrescription when repository updates return null", async () => {
      vi.spyOn(medicineRepository, "update").mockResolvedValueOnce(null);
      vi.spyOn(medicineRepository, "markStopped").mockResolvedValueOnce(null);

      const res = await prescriptionDiffService.confirmPrescription(fakeId, "user-1", {
        applyAdded: [],
        applyUpdated: [
          {
            id: fakeId,
            name: "Meds",
            strengthText: "10mg",
            frequencyText: "daily",
            anchors: ["breakfast"],
            withFood: null,
            instructions: "test",
          },
        ],
        stopDiscontinuedIds: [fakeId2],
      });

      expect(res.applied.updated).toBe(0);
      expect(res.applied.stopped).toBe(0);
    });
  });
});
