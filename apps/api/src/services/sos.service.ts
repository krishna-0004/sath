import crypto from "node:crypto";
import { env } from "../config/env.js";
import { NotFoundError } from "../errors/http-errors.js";
import { logger } from "../config/logger.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { doctorContactRepository } from "../repositories/doctor-contact.repository.js";
import { medicineRepository } from "../repositories/medicine.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { reportRepository } from "../repositories/report.repository.js";
import { shareLinkRepository } from "../repositories/share-link.repository.js";
import type { TriggerSosInput } from "../schemas/sos.schema.js";

export interface SosDispatchResult {
  emergencyId: string;
  shareToken: string;
  shareUrl: string;
  elderName: string;
  emergencyPhone: string | null;
  doctorContactsNotified: number;
  whatsappLinks: Array<{ doctorName: string; whatsappUrl: string; kind: string }>;
  triggeredAt: Date;
}

export const sosService = {
  async triggerSos(
    profileId: string,
    userId: string,
    input: TriggerSosInput,
    requestId?: string,
  ): Promise<SosDispatchResult> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const emergencyId = crypto.randomUUID();
    const shareToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL

    await shareLinkRepository.create({
      profileId,
      token: shareToken,
      scope: "emergency",
      expiresAt,
      createdBy: userId,
    });

    const shareUrl = `${env.CLIENT_ORIGIN}/emergency/${shareToken}`;

    // Load doctor contacts with recorded consent
    const doctorContacts = await doctorContactRepository.findActiveByProfile(profileId);
    const consentedDoctors = doctorContacts.filter(
      (doc) => doc.consentRecordedAt && !doc.revokedAt,
    );

    // Format WhatsApp links for immediate one-tap family/doctor messaging
    const whatsappLinks = consentedDoctors.map((doc) => {
      const cleanPhone = doc.whatsappNumber.replace(/[^\d]/g, "");
      const locationPart = input.locationText ? ` Location: ${input.locationText}.` : "";
      const text = encodeURIComponent(
        `🚨 EMERGENCY SOS from ${profile.elderName}.${locationPart} Medical info & active medicines: ${shareUrl}`,
      );
      return {
        doctorName: doc.name,
        kind: doc.kind,
        whatsappUrl: `https://wa.me/${cleanPhone}?text=${text}`,
      };
    });

    // Log emergency dispatch event (never log medical details per Rule 8)
    logger.info(
      {
        profileId,
        emergencyId,
        consentedDoctorsCount: consentedDoctors.length,
      },
      "Emergency SOS alert dispatched",
    );

    // Audit trail
    await auditEventRepository.create({
      actorUserId: userId,
      action: "sos.triggered",
      outcome: "success",
      metadata: {
        profileId,
        emergencyId,
        notifiedDoctorsCount: consentedDoctors.length,
        hasVoiceNote: Boolean(input.voiceNoteUrl),
      },
      requestId: requestId ?? null,
    });

    return {
      emergencyId,
      shareToken,
      shareUrl,
      elderName: profile.elderName,
      emergencyPhone: profile.emergencyPhone ?? null,
      doctorContactsNotified: consentedDoctors.length,
      whatsappLinks,
      triggeredAt: new Date(),
    };
  },

  async getEmergencySummaryByToken(token: string) {
    const shareLink = await shareLinkRepository.findValidToken(token);
    if (!shareLink) {
      throw new NotFoundError("Emergency share link expired or invalid");
    }

    const profileId = shareLink.profileId.toString();
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const activeMeds = await medicineRepository.findActiveByProfile(profileId);
    const doctorContacts = await doctorContactRepository.findActiveByProfile(profileId);
    const recentReports = await reportRepository.findByProfile(profileId);

    return {
      elderName: profile.elderName,
      emergencyPhone: profile.emergencyPhone ?? null,
      timezone: profile.timezone,
      medicines: activeMeds.map((m) => ({
        name: m.name,
        strengthText: m.strengthText,
        frequencyText: m.frequencyText,
        anchors: m.anchors,
        withFood: m.withFood,
        instructions: m.notes,
      })),
      doctorContacts: doctorContacts
        .filter((d) => !d.revokedAt)
        .map((d) => ({
          name: d.name,
          kind: d.kind,
          whatsappNumber: d.whatsappNumber,
        })),
      recentReports: recentReports.slice(0, 3).map((r) => ({
        title: r.title,
        testDate: r.testDate,
        metrics: r.metrics.map((m) => ({
          name: m.name,
          value: m.value,
          unit: m.unit,
          flag: m.flag,
        })),
      })),
    };
  },
};
