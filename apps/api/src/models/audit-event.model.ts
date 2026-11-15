import { Document, Schema, Types, model } from "mongoose";

export interface AuditEventDocument extends Document {
  actorUserId: Types.ObjectId | string | null;
  action: string;
  outcome: "success" | "failure";
  metadata: Record<string, unknown>;
  requestId: string | null;
  createdAt: Date;
}

const auditEventSchema = new Schema<AuditEventDocument>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
    },
    outcome: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    requestId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
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

auditEventSchema.index({ actorUserId: 1 });
auditEventSchema.index({ action: 1 });

export const AuditEventModel = model<AuditEventDocument>("AuditEvent", auditEventSchema);
