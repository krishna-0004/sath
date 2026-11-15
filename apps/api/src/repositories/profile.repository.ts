import { ProfileModel, type ProfileDocument } from "../models/profile.model.js";

export interface CreateProfileDto {
  elderName: string;
  joinCode: string;
  passcodeHash: string;
  timezone?: string;
  anchorTimes?: {
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
  };
  sharing?: {
    medicines: boolean;
    reports: boolean;
    appointments: boolean;
  };
  emergencyPhone?: string | null;
  createdBy: string;
}

export interface UpdateProfileDto {
  elderName?: string;
  timezone?: string;
  anchorTimes?: {
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
  };
  sharing?: {
    medicines: boolean;
    reports: boolean;
    appointments: boolean;
  };
  emergencyPhone?: string | null;
}

export const profileRepository = {
  async create(data: CreateProfileDto): Promise<ProfileDocument> {
    const profile = new ProfileModel(data);
    return profile.save();
  },

  async findById(id: string): Promise<ProfileDocument | null> {
    return ProfileModel.findById(id).exec();
  },

  async findByJoinCode(joinCode: string): Promise<ProfileDocument | null> {
    return ProfileModel.findOne({ joinCode: joinCode.trim().toUpperCase() }).exec();
  },

  async update(id: string, updates: UpdateProfileDto): Promise<ProfileDocument | null> {
    return ProfileModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).exec();
  },

  async updatePasscode(id: string, passcodeHash: string): Promise<ProfileDocument | null> {
    return ProfileModel.findByIdAndUpdate(id, { $set: { passcodeHash } }, { new: true }).exec();
  },

  async deleteById(id: string): Promise<boolean> {
    const res = await ProfileModel.findByIdAndDelete(id).exec();
    return Boolean(res);
  },
};
