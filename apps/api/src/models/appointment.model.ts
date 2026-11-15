import { Document, Schema, Types, model } from "mongoose";

export interface AppointmentDocument extends Document {
  profileId: Types.ObjectId | string;
  title: string;
  doctorName: string;
  location: string;
  startsAt: Date;
  notes: string;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "",
    },
    startsAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
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
        return ret;
      },
    },
  },
);

appointmentSchema.index({ profileId: 1, startsAt: 1 });

export const AppointmentModel = model<AppointmentDocument>("Appointment", appointmentSchema);
