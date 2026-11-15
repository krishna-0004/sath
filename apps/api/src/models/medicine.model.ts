import { Document, Schema, Types, model } from "mongoose";

export type MedicineAnchor = "breakfast" | "lunch" | "dinner" | "bedtime";
export type WithFoodTiming = "before" | "after" | "with" | null;
export type MedicineStatus = "active" | "stopped";
export type MedicineSource = "manual" | "scan";

export interface MedicineDocument extends Document {
  profileId: Types.ObjectId | string;
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: MedicineAnchor[];
  withFood: WithFoodTiming;
  notes: string;
  status: MedicineStatus;
  source: MedicineSource;
  createdBy: Types.ObjectId | string;
  updatedBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<MedicineDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    strengthText: {
      type: String,
      required: true,
      trim: true,
    },
    frequencyText: {
      type: String,
      required: true,
      trim: true,
    },
    anchors: {
      type: [String],
      enum: ["breakfast", "lunch", "dinner", "bedtime"],
      default: [],
    },
    withFood: {
      type: String,
      enum: ["before", "after", "with", null],
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "stopped"],
      default: "active",
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "scan"],
      default: "manual",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
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
        return ret;
      },
    },
  },
);

medicineSchema.index({ profileId: 1, status: 1 });
medicineSchema.index({ profileId: 1, name: 1 });

export const MedicineModel = model<MedicineDocument>("Medicine", medicineSchema);
