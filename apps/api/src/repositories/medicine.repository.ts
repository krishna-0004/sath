import {
  MedicineModel,
  type MedicineDocument,
  type MedicineAnchor,
  type WithFoodTiming,
  type MedicineStatus,
  type MedicineSource,
} from "../models/medicine.model.js";

export interface CreateMedicineDto {
  profileId: string;
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: MedicineAnchor[];
  withFood?: WithFoodTiming;
  notes?: string;
  status?: MedicineStatus;
  source?: MedicineSource;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateMedicineDto {
  name?: string;
  strengthText?: string;
  frequencyText?: string;
  anchors?: MedicineAnchor[];
  withFood?: WithFoodTiming;
  notes?: string;
  status?: MedicineStatus;
  source?: MedicineSource;
  updatedBy: string;
}

export const medicineRepository = {
  async create(data: CreateMedicineDto): Promise<MedicineDocument> {
    const med = new MedicineModel(data);
    return med.save();
  },

  async findById(id: string): Promise<MedicineDocument | null> {
    return MedicineModel.findById(id).exec();
  },

  async findActiveByProfile(profileId: string): Promise<MedicineDocument[]> {
    return MedicineModel.find({ profileId, status: "active" }).sort({ name: 1 }).exec();
  },

  async findAllByProfile(profileId: string): Promise<MedicineDocument[]> {
    return MedicineModel.find({ profileId }).sort({ status: 1, name: 1 }).exec();
  },

  async update(id: string, updates: UpdateMedicineDto): Promise<MedicineDocument | null> {
    return MedicineModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).exec();
  },

  async markStopped(id: string, updatedBy: string): Promise<MedicineDocument | null> {
    return MedicineModel.findByIdAndUpdate(
      id,
      { $set: { status: "stopped", updatedBy } },
      { new: true },
    ).exec();
  },

  async deleteByProfileId(profileId: string): Promise<number> {
    const res = await MedicineModel.deleteMany({ profileId }).exec();
    return res.deletedCount ?? 0;
  },

  async countActive(profileId: string): Promise<number> {
    return MedicineModel.countDocuments({ profileId, status: "active" }).exec();
  },
};
