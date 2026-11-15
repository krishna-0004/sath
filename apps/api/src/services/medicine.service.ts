import { NotFoundError } from "../errors/http-errors.js";
import { type MedicineDocument } from "../models/medicine.model.js";
import { medicineRepository } from "../repositories/medicine.repository.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import type { CreateMedicineInput, UpdateMedicineInput } from "../schemas/medicine.schema.js";

export const medicineService = {
  async createMedicine(
    profileId: string,
    userId: string,
    input: CreateMedicineInput,
    requestId?: string,
  ): Promise<MedicineDocument> {
    const medicine = await medicineRepository.create({
      profileId,
      name: input.name,
      strengthText: input.strengthText,
      frequencyText: input.frequencyText,
      anchors: input.anchors,
      withFood: input.withFood ?? null,
      notes: input.notes ?? "",
      source: input.source ?? "manual",
      createdBy: userId,
      updatedBy: userId,
    });

    await auditEventRepository.create({
      actorUserId: userId,
      action: "medicine.created",
      outcome: "success",
      metadata: { profileId, medicineId: medicine.id, name: medicine.name },
      requestId: requestId ?? null,
    });

    return medicine;
  },

  async listMedicines(profileId: string): Promise<MedicineDocument[]> {
    return medicineRepository.findAllByProfile(profileId);
  },

  async updateMedicine(
    profileId: string,
    medicineId: string,
    userId: string,
    input: UpdateMedicineInput,
    requestId?: string,
  ): Promise<MedicineDocument> {
    const med = await medicineRepository.findById(medicineId);
    if (!med || med.profileId.toString() !== profileId) {
      throw new NotFoundError("Medicine not found");
    }

    const updated = await medicineRepository.update(medicineId, {
      ...input,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundError("Medicine not found");
    }

    await auditEventRepository.create({
      actorUserId: userId,
      action: "medicine.updated",
      outcome: "success",
      metadata: { profileId, medicineId, name: updated.name },
      requestId: requestId ?? null,
    });

    return updated;
  },

  async stopMedicine(
    profileId: string,
    medicineId: string,
    userId: string,
    requestId?: string,
  ): Promise<MedicineDocument> {
    const med = await medicineRepository.findById(medicineId);
    if (!med || med.profileId.toString() !== profileId) {
      throw new NotFoundError("Medicine not found");
    }

    const stopped = await medicineRepository.markStopped(medicineId, userId);
    if (!stopped) {
      throw new NotFoundError("Medicine not found");
    }

    await auditEventRepository.create({
      actorUserId: userId,
      action: "medicine.stopped",
      outcome: "success",
      metadata: { profileId, medicineId, name: stopped.name },
      requestId: requestId ?? null,
    });

    return stopped;
  },
};
