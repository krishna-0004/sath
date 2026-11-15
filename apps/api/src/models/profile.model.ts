import { Document, Schema, Types, model } from "mongoose";

export interface AnchorTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
  bedtime: string;
}

export interface ProfileSharing {
  medicines: boolean;
  reports: boolean;
  appointments: boolean;
}

export interface ProfileDocument extends Document {
  elderName: string;
  joinCode: string;
  passcodeHash: string;
  timezone: string;
  anchorTimes: AnchorTimes;
  sharing: ProfileSharing;
  emergencyPhone: string | null;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDocument>(
  {
    elderName: {
      type: String,
      required: true,
      trim: true,
    },
    joinCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    passcodeHash: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    anchorTimes: {
      breakfast: { type: String, default: "08:00" },
      lunch: { type: String, default: "13:00" },
      dinner: { type: String, default: "20:00" },
      bedtime: { type: String, default: "22:00" },
    },
    sharing: {
      medicines: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      appointments: { type: Boolean, default: true },
    },
    emergencyPhone: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
        delete ret["passcodeHash"]; // Never expose hashed passcodes in JSON
        return ret;
      },
    },
  },
);

profileSchema.index({ joinCode: 1 }, { unique: true });
profileSchema.index({ createdBy: 1 });

export const ProfileModel = model<ProfileDocument>("Profile", profileSchema);
