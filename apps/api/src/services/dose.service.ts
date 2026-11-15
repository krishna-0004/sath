import { DateTime } from "luxon";
import { NotFoundError } from "../errors/http-errors.js";
import { type DoseStatus, type DoseEventDocument } from "../models/dose-event.model.js";
import { type ProfileDocument } from "../models/profile.model.js";
import { type MedicineAnchor } from "../models/medicine.model.js";
import { doseEventRepository } from "../repositories/dose-event.repository.js";
import { medicineRepository } from "../repositories/medicine.repository.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import type { RecordDoseInput } from "../schemas/dose.schema.js";

const DEFAULT_ANCHOR_TIMES: Record<MedicineAnchor, string> = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00",
  bedtime: "22:00",
};

export interface DecoratedDose {
  id: string;
  profileId: string;
  medicine: unknown;
  scheduledFor: Date;
  status: DoseStatus;
  displayStatus: "pending" | "due" | "missed" | "taken" | "spilled" | "skipped";
  reasonText: string;
  recordedBy: unknown;
  recordedAt: Date | null;
}

export const doseService = {
  async getTodayDoses(profile: ProfileDocument): Promise<DecoratedDose[]> {
    const timezone = profile.timezone || "Asia/Kolkata";
    const localNow = DateTime.now().setZone(timezone);
    const startOfDayUtc = localNow.startOf("day").toJSDate();
    const endOfDayUtc = localNow.endOf("day").toJSDate();

    const activeMeds = await medicineRepository.findActiveByProfile(profile.id);
    const anchorTimes = profile.anchorTimes || DEFAULT_ANCHOR_TIMES;

    // Build schedule for today
    const pendingDoses: Array<{
      profileId: string;
      medicineId: string;
      scheduledFor: Date;
    }> = [];

    for (const med of activeMeds) {
      for (const anchor of med.anchors) {
        const timeStr = anchorTimes[anchor] || DEFAULT_ANCHOR_TIMES[anchor];
        const [hours, minutes] = timeStr.split(":").map(Number);

        const scheduledLocal = localNow.set({
          hour: hours,
          minute: minutes,
          second: 0,
          millisecond: 0,
        });

        pendingDoses.push({
          profileId: profile.id,
          medicineId: med.id,
          scheduledFor: scheduledLocal.toJSDate(),
        });
      }
    }

    // Lazy upsert doses for today
    await doseEventRepository.bulkUpsertPending(pendingDoses);

    // Fetch all doses for today in chronological order
    const doses = await doseEventRepository.findByProfileAndDateRange(
      profile.id,
      startOfDayUtc,
      endOfDayUtc,
    );

    const nowTime = Date.now();
    return doses.map((d) => {
      let displayStatus: DecoratedDose["displayStatus"] = d.status;
      if (d.status === "pending") {
        // Missed if more than 120 minutes past scheduled time
        const isMissed = nowTime > d.scheduledFor.getTime() + 120 * 60 * 1000;
        displayStatus = isMissed ? "missed" : "pending";
      }

      return {
        id: d.id,
        profileId: d.profileId.toString(),
        medicine: d.medicineId,
        scheduledFor: d.scheduledFor,
        status: d.status,
        displayStatus,
        reasonText: d.reasonText,
        recordedBy: d.recordedBy,
        recordedAt: d.recordedAt,
      };
    });
  },

  async recordDose(
    profileId: string,
    doseId: string,
    userId: string,
    input: RecordDoseInput,
    requestId?: string,
  ): Promise<DoseEventDocument> {
    const dose = await doseEventRepository.findById(doseId);
    if (!dose || dose.profileId.toString() !== profileId) {
      throw new NotFoundError("Dose event not found");
    }

    const updated = await doseEventRepository.updateStatus(
      doseId,
      input.status,
      userId,
      input.reasonText ?? "",
      new Date(),
    );

    if (!updated) {
      throw new NotFoundError("Dose event not found");
    }

    await auditEventRepository.create({
      actorUserId: userId,
      action: "dose.recorded",
      outcome: "success",
      metadata: {
        profileId,
        doseId,
        status: input.status,
        reasonText: input.reasonText,
      },
      requestId: requestId ?? null,
    });

    return updated;
  },

  async getSummary(
    profile: ProfileDocument,
    days = 7,
  ): Promise<{
    days: number;
    total: number;
    taken: number;
    spilled: number;
    skipped: number;
    missed: number;
    pending: number;
    adherenceRate: number;
  }> {
    const timezone = profile.timezone || "Asia/Kolkata";
    const localNow = DateTime.now().setZone(timezone);
    const startRangeUtc = localNow
      .minus({ days: days - 1 })
      .startOf("day")
      .toJSDate();
    const endRangeUtc = localNow.endOf("day").toJSDate();

    const doses = await doseEventRepository.findByProfileAndDateRange(
      profile.id,
      startRangeUtc,
      endRangeUtc,
    );

    let taken = 0;
    let spilled = 0;
    let skipped = 0;
    let missed = 0;
    let pending = 0;
    const nowTime = Date.now();

    for (const d of doses) {
      if (d.status === "taken") {
        taken++;
      } else if (d.status === "spilled") {
        spilled++;
      } else if (d.status === "skipped") {
        skipped++;
      } else if (d.status === "pending") {
        const isMissed = nowTime > d.scheduledFor.getTime() + 120 * 60 * 1000;
        if (isMissed) {
          missed++;
        } else {
          pending++;
        }
      }
    }

    const total = doses.length;
    // Skipped by choice is conscious and does not penalize adherence
    const accountableDoses = taken + spilled + missed;
    const adherenceRate = accountableDoses > 0 ? Math.round((taken / accountableDoses) * 100) : 100;

    return {
      days,
      total,
      taken,
      spilled,
      skipped,
      missed,
      pending,
      adherenceRate,
    };
  },
};
