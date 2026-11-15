import { medicineRepository } from "../repositories/medicine.repository.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { aiClientService } from "./ai-client.service.js";
import { uploadService } from "./upload.service.js";
import type { MedicineAnchor } from "../models/medicine.model.js";
import type {
  PrescriptionConfirmInput,
  ProposedMedicine,
  ProposedUpdateMedicine,
} from "../schemas/prescription-diff.schema.js";

export interface PrescriptionDiffResult {
  added: ProposedMedicine[];
  updated: ProposedUpdateMedicine[];
  unchanged: ProposedUpdateMedicine[];
  possiblyDiscontinued: Array<{
    id: string;
    name: string;
    strengthText: string;
    frequencyText: string;
    anchors: MedicineAnchor[];
  }>;
}

export interface PrescriptionPreviewResult {
  diff: PrescriptionDiffResult;
  rawDoctorNotes: string;
  rawDateText: string | null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function parseValidAnchors(anchors: string[]): MedicineAnchor[] {
  const valid: MedicineAnchor[] = ["breakfast", "lunch", "dinner", "bedtime"];
  const filtered = anchors.filter((a): a is MedicineAnchor => valid.includes(a as MedicineAnchor));
  return filtered.length > 0 ? filtered : ["breakfast"];
}

export const prescriptionDiffService = {
  async previewPrescription(
    profileId: string,
    uploadId: string,
  ): Promise<PrescriptionPreviewResult> {
    // 1. Resolve asset from upload service
    let base64Data: string | undefined;
    let mimeType: string | undefined;
    let imageUrl: string | undefined;

    try {
      const mockAsset = uploadService.getMockAsset(uploadId);
      if (mockAsset) {
        base64Data = mockAsset.buffer.toString("base64");
        mimeType = mockAsset.fileType;
      }
    } catch {
      // In production Cloudinary mode, URL is passed directly
      imageUrl = `https://res.cloudinary.com/saath/image/authenticated/${uploadId}`;
    }

    // 2. Call AI service for structured OCR transcription
    const extraction = await aiClientService.extractPrescription({
      base64Data,
      mimeType,
      imageUrl,
    });

    // 3. Retrieve currently active medicines for profile
    const activeMeds = await medicineRepository.findActiveByProfile(profileId);
    const activeMap = new Map<string, (typeof activeMeds)[number]>();
    for (const med of activeMeds) {
      activeMap.set(normalizeName(med.name), med);
    }

    const added: ProposedMedicine[] = [];
    const updated: ProposedUpdateMedicine[] = [];
    const unchanged: ProposedUpdateMedicine[] = [];
    const matchedActiveIds = new Set<string>();

    for (const ext of extraction.medicines) {
      const norm = normalizeName(ext.name);
      const existing = activeMap.get(norm);
      const validAnchors = parseValidAnchors(ext.anchors);

      const extWithFood: "before" | "after" | "with" | null =
        typeof ext.withFood === "boolean"
          ? ext.withFood
            ? "with"
            : null
          : ((ext.withFood as "before" | "after" | "with" | null) ?? null);

      if (!existing) {
        added.push({
          name: ext.name,
          strengthText: ext.strengthText,
          frequencyText: ext.frequencyText,
          anchors: validAnchors,
          withFood: extWithFood,
          instructions: ext.instructions ?? "",
        });
      } else {
        matchedActiveIds.add(existing.id);

        const strengthChanged = ext.strengthText && ext.strengthText !== existing.strengthText;
        const frequencyChanged = ext.frequencyText && ext.frequencyText !== existing.frequencyText;
        const anchorsChanged = !arraysEqual(validAnchors, existing.anchors);

        const proposedItem: ProposedUpdateMedicine = {
          id: existing.id,
          name: existing.name,
          strengthText: ext.strengthText || existing.strengthText,
          frequencyText: ext.frequencyText || existing.frequencyText,
          anchors: validAnchors.length > 0 ? validAnchors : existing.anchors,
          withFood: extWithFood !== null ? extWithFood : existing.withFood,
          instructions: ext.instructions || existing.notes,
        };

        if (strengthChanged || frequencyChanged || anchorsChanged) {
          updated.push(proposedItem);
        } else {
          unchanged.push(proposedItem);
        }
      }
    }

    // 4. Any active medicine not appearing in prescription is marked as possibly discontinued
    const possiblyDiscontinued = activeMeds
      .filter((med) => !matchedActiveIds.has(med.id))
      .map((med) => ({
        id: med.id,
        name: med.name,
        strengthText: med.strengthText,
        frequencyText: med.frequencyText,
        anchors: med.anchors,
      }));

    return {
      diff: {
        added,
        updated,
        unchanged,
        possiblyDiscontinued,
      },
      rawDoctorNotes: extraction.rawDoctorNotes,
      rawDateText: extraction.rawDateText,
    };
  },

  async confirmPrescription(
    profileId: string,
    userId: string,
    input: PrescriptionConfirmInput,
    requestId?: string,
  ): Promise<{ applied: { added: number; updated: number; stopped: number } }> {
    let addedCount = 0;
    let updatedCount = 0;
    let stoppedCount = 0;

    // Apply additions
    for (const item of input.applyAdded) {
      const created = await medicineRepository.create({
        profileId,
        name: item.name,
        strengthText: item.strengthText,
        frequencyText: item.frequencyText,
        anchors: item.anchors,
        withFood: item.withFood ?? null,
        notes: item.instructions ?? "",
        source: "scan",
        createdBy: userId,
        updatedBy: userId,
      });

      await auditEventRepository.create({
        actorUserId: userId,
        action: "medicine.created",
        outcome: "success",
        metadata: {
          profileId,
          medicineId: created.id,
          name: created.name,
          source: "prescription_scan",
        },
        requestId: requestId ?? null,
      });
      addedCount++;
    }

    // Apply updates
    for (const item of input.applyUpdated) {
      const updated = await medicineRepository.update(item.id, {
        strengthText: item.strengthText,
        frequencyText: item.frequencyText,
        anchors: item.anchors,
        withFood: item.withFood ?? null,
        notes: item.instructions,
        source: "scan",
        updatedBy: userId,
      });

      if (updated) {
        await auditEventRepository.create({
          actorUserId: userId,
          action: "medicine.updated",
          outcome: "success",
          metadata: {
            profileId,
            medicineId: updated.id,
            name: updated.name,
            source: "prescription_scan",
          },
          requestId: requestId ?? null,
        });
        updatedCount++;
      }
    }

    // Apply stops (discontinued)
    for (const medId of input.stopDiscontinuedIds) {
      const stopped = await medicineRepository.markStopped(medId, userId);
      if (stopped) {
        await auditEventRepository.create({
          actorUserId: userId,
          action: "medicine.stopped",
          outcome: "success",
          metadata: {
            profileId,
            medicineId: stopped.id,
            name: stopped.name,
            source: "prescription_scan",
          },
          requestId: requestId ?? null,
        });
        stoppedCount++;
      }
    }

    return {
      applied: {
        added: addedCount,
        updated: updatedCount,
        stopped: stoppedCount,
      },
    };
  },
};
