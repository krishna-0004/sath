import { Document, Schema, Types, model } from "mongoose";

export type DoctorContactKind = "family_doctor" | "emergency_doctor";

export interface DoctorContactDocument extends Document {
  profileId: Types.ObjectId | string;
  kind: DoctorContactKind;
  name: string;
  email: string;
  whatsappNumber: string;
  consentRecordedAt: Date;
  consentBy: Types.ObjectId | string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const doctorContactSchema = new Schema<DoctorContactDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    kind: {
      type: String,
      enum: ["family_doctor", "emergency_doctor"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
    },
    consentRecordedAt: {
      type: Date,
      required: true,
    },
    consentBy: {
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

doctorContactSchema.index({ profileId: 1, revokedAt: 1 });

export const DoctorContactModel = model<DoctorContactDocument>(
  "DoctorContact",
  doctorContactSchema,
);
