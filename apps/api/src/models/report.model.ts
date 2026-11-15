import { Document, Schema, Types, model } from "mongoose";

export type MetricFlag = "normal" | "low" | "high" | "unknown";

export interface ReportMetric {
  name: string;
  value: number | string;
  unit: string;
  referenceRangeText: string;
  flag: MetricFlag;
}

export interface ReportDocument extends Document {
  profileId: Types.ObjectId | string;
  title: string;
  testDate: Date;
  labName: string;
  metrics: ReportMetric[];
  fileUrl: string;
  notes: string;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const reportMetricSchema = new Schema<ReportMetric>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, default: "", trim: true },
    referenceRangeText: { type: String, default: "", trim: true },
    flag: {
      type: String,
      enum: ["normal", "low", "high", "unknown"],
      default: "unknown",
      required: true,
    },
  },
  { _id: false },
);

const reportSchema = new Schema<ReportDocument>(
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
    testDate: {
      type: Date,
      required: true,
    },
    labName: {
      type: String,
      default: "",
      trim: true,
    },
    metrics: {
      type: [reportMetricSchema],
      default: [],
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
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

reportSchema.index({ profileId: 1, testDate: -1 });
reportSchema.index({ profileId: 1, "metrics.name": 1 });

export const ReportModel = model<ReportDocument>("Report", reportSchema);
