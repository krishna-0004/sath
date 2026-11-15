import { Types } from "mongoose";
import { ShareLinkDocument, ShareLinkModel, ShareLinkScope } from "../models/share-link.model.js";

export interface CreateShareLinkDto {
  profileId: string | Types.ObjectId;
  token: string;
  scope: ShareLinkScope;
  expiresAt: Date;
  createdBy: string | Types.ObjectId;
}

export const shareLinkRepository = {
  async create(data: CreateShareLinkDto): Promise<ShareLinkDocument> {
    const link = new ShareLinkModel(data);
    return link.save();
  },

  async findValidToken(token: string): Promise<ShareLinkDocument | null> {
    return ShareLinkModel.findOne({
      token,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();
  },

  async revoke(token: string): Promise<ShareLinkDocument | null> {
    return ShareLinkModel.findOneAndUpdate(
      { token },
      { revokedAt: new Date() },
      { new: true },
    ).exec();
  },
};
