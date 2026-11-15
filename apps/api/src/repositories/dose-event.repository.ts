import {
  DoseEventModel,
  type DoseEventDocument,
  type DoseStatus,
} from "../models/dose-event.model.js";

export interface PendingDoseDescriptor {
  profileId: string;
  medicineId: string;
  scheduledFor: Date;
}

export const doseEventRepository = {
  async bulkUpsertPending(doses: PendingDoseDescriptor[]): Promise<void> {
    if (doses.length === 0) return;

    const ops = doses.map((d) => ({
      updateOne: {
        filter: {
          profileId: d.profileId,
          medicineId: d.medicineId,
          scheduledFor: d.scheduledFor,
        },
        update: {
          $setOnInsert: {
            profileId: d.profileId,
            medicineId: d.medicineId,
            scheduledFor: d.scheduledFor,
            status: "pending" as DoseStatus,
            reasonText: "",
            recordedBy: null,
            recordedAt: null,
          },
        },
        upsert: true,
      },
    }));

    await DoseEventModel.bulkWrite(ops, { ordered: false });
  },

  async findById(id: string): Promise<DoseEventDocument | null> {
    return DoseEventModel.findById(id).populate("medicineId").exec();
  },

  async findByProfileAndDateRange(
    profileId: string,
    startUtc: Date,
    endUtc: Date,
  ): Promise<DoseEventDocument[]> {
    return DoseEventModel.find({
      profileId,
      scheduledFor: { $gte: startUtc, $lt: endUtc },
    })
      .populate("medicineId")
      .sort({ scheduledFor: 1 })
      .exec();
  },

  async updateStatus(
    id: string,
    status: DoseStatus,
    recordedBy: string,
    reasonText = "",
    recordedAt = new Date(),
  ): Promise<DoseEventDocument | null> {
    return DoseEventModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          recordedBy,
          reasonText,
          recordedAt,
        },
      },
      { new: true },
    )
      .populate("medicineId")
      .exec();
  },

  async deleteByProfileId(profileId: string): Promise<number> {
    const res = await DoseEventModel.deleteMany({ profileId }).exec();
    return res.deletedCount ?? 0;
  },

  async deleteByMedicineId(medicineId: string): Promise<number> {
    const res = await DoseEventModel.deleteMany({ medicineId }).exec();
    return res.deletedCount ?? 0;
  },
};
