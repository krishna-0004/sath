import { Document, Schema, Types, model } from "mongoose";

export type DoseStatus = "pending" | "taken" | "spilled" | "skipped";

export interface DoseEventDocument extends Document {
  profileId: Types.ObjectId | string;
  medicineId: Types.ObjectId | string;
  scheduledFor: Date;
  status: DoseStatus;
  reasonText: string;
  recordedBy: Types.ObjectId | string | null;
  recordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const doseEventSchema = new Schema<DoseEventDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "taken", "spilled", "skipped"],
      default: "pending",
      required: true,
    },
    reasonText: {
      type: String,
      default: "",
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recordedAt: {
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

doseEventSchema.index({ medicineId: 1, scheduledFor: 1 }, { unique: true });
doseEventSchema.index({ profileId: 1, scheduledFor: 1 });
doseEventSchema.index({ profileId: 1, status: 1 });

export const DoseEventModel = model<DoseEventDocument>("DoseEvent", doseEventSchema);
