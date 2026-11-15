import { Document, Schema, model } from "mongoose";

export interface UserDocument extends Document {
  googleId?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isDemo: boolean;
  status: "active" | "disabled";
  createdAt: Date;
  lastLoginAt: Date | null;
}

const userSchema = new Schema<UserDocument>(
  {
    googleId: {
      type: String,
      required: function (this: UserDocument) {
        return !this.isDemo;
      },
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
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

userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true });

export const UserModel = model<UserDocument>("User", userSchema);
