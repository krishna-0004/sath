import mongoose, { Document, Schema, Types } from "mongoose";

export type ShareLinkScope = "emergency" | "care_brief";

export interface IShareLink {
  profileId: Types.ObjectId;
  token: string;
  scope: ShareLinkScope;
  expiresAt: Date;
  createdBy: Types.ObjectId;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ShareLinkDocument = IShareLink & Document;

const shareLinkSchema = new Schema<ShareLinkDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ["emergency", "care_brief"],
      required: true,
      default: "emergency",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id ? String(ret._id) : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const ShareLinkModel =
  (mongoose.models.ShareLink as mongoose.Model<ShareLinkDocument>) ||
  mongoose.model<ShareLinkDocument>("ShareLink", shareLinkSchema);
