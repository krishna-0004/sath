import {
  MembershipModel,
  type MembershipDocument,
  type ProfileRole,
  type MembershipStatus,
} from "../models/membership.model.js";

export interface CreateMembershipDto {
  profileId: string;
  userId: string;
  role: ProfileRole;
  status?: MembershipStatus;
  joinedAt?: Date;
}

export const membershipRepository = {
  async create(data: CreateMembershipDto): Promise<MembershipDocument> {
    const membership = new MembershipModel(data);
    return membership.save();
  },

  async findByProfileAndUser(
    profileId: string,
    userId: string,
  ): Promise<MembershipDocument | null> {
    return MembershipModel.findOne({ profileId, userId }).exec();
  },

  async findActiveByProfileAndUser(
    profileId: string,
    userId: string,
  ): Promise<MembershipDocument | null> {
    return MembershipModel.findOne({ profileId, userId, status: "active" }).exec();
  },

  async findActiveByUser(userId: string): Promise<MembershipDocument[]> {
    return MembershipModel.find({ userId, status: "active" })
      .populate("profileId")
      .sort({ createdAt: -1 })
      .exec();
  },

  async findActiveByProfile(profileId: string): Promise<MembershipDocument[]> {
    return MembershipModel.find({ profileId, status: "active" })
      .populate("userId", "name email avatarUrl")
      .sort({ joinedAt: 1 })
      .exec();
  },

  async updateRole(
    profileId: string,
    userId: string,
    role: ProfileRole,
  ): Promise<MembershipDocument | null> {
    return MembershipModel.findOneAndUpdate(
      { profileId, userId, status: "active" },
      { $set: { role } },
      { new: true, runValidators: true },
    ).exec();
  },

  async revoke(profileId: string, userId: string): Promise<MembershipDocument | null> {
    return MembershipModel.findOneAndUpdate(
      { profileId, userId, status: "active" },
      { $set: { status: "revoked" } },
      { new: true },
    ).exec();
  },

  async countActiveElders(profileId: string): Promise<number> {
    return MembershipModel.countDocuments({
      profileId,
      role: "elder",
      status: "active",
    }).exec();
  },

  async deleteByProfileId(profileId: string): Promise<number> {
    const res = await MembershipModel.deleteMany({ profileId }).exec();
    return res.deletedCount ?? 0;
  },
};
