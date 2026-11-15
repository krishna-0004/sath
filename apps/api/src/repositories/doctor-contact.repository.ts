import {
  DoctorContactModel,
  type DoctorContactDocument,
  type DoctorContactKind,
} from "../models/doctor-contact.model.js";

export interface CreateDoctorContactDto {
  profileId: string;
  kind: DoctorContactKind;
  name: string;
  email: string;
  whatsappNumber: string;
  consentRecordedAt: Date;
  consentBy: string;
}

export const doctorContactRepository = {
  async create(data: CreateDoctorContactDto): Promise<DoctorContactDocument> {
    const contact = new DoctorContactModel(data);
    return contact.save();
  },

  async findById(id: string): Promise<DoctorContactDocument | null> {
    return DoctorContactModel.findById(id).exec();
  },

  async findActiveByProfile(profileId: string): Promise<DoctorContactDocument[]> {
    return DoctorContactModel.find({ profileId, revokedAt: null }).sort({ createdAt: -1 }).exec();
  },

  async findByProfileAndKind(
    profileId: string,
    kind: DoctorContactKind,
  ): Promise<DoctorContactDocument | null> {
    return DoctorContactModel.findOne({
      profileId,
      kind,
      revokedAt: null,
    }).exec();
  },

  async revoke(id: string): Promise<DoctorContactDocument | null> {
    return DoctorContactModel.findByIdAndUpdate(
      id,
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).exec();
  },

  async deleteByProfileId(profileId: string): Promise<number> {
    const res = await DoctorContactModel.deleteMany({ profileId }).exec();
    return res.deletedCount ?? 0;
  },
};
