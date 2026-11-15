import { Document, Schema, Types, model } from "mongoose";

export interface JoinAttemptDocument extends Document {
  userId: Types.ObjectId | string;
  joinCode: string;
  count: number;
  lockedUntil: Date | null;
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const joinAttemptSchema = new Schema<JoinAttemptDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
      required: true,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    expireAt: {
      type: Date,
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

joinAttemptSchema.index({ userId: 1, joinCode: 1 }, { unique: true });
joinAttemptSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const JoinAttemptModel = model<JoinAttemptDocument>("JoinAttempt", joinAttemptSchema);
