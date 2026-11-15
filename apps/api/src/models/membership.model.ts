import { Document, Schema, Types, model } from "mongoose";

export type ProfileRole = "elder" | "editor" | "viewer";
export type MembershipStatus = "active" | "revoked";

export interface MembershipDocument extends Document {
  profileId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  role: ProfileRole;
  status: MembershipStatus;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<MembershipDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["elder", "editor", "viewer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret["id"] = ret["_id"]?.toString();
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  },
);

membershipSchema.index({ profileId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ profileId: 1, status: 1 });

export const MembershipModel = model<MembershipDocument>("Membership", membershipSchema);
