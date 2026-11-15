import { ConflictError } from "../errors/http-errors.js";
import { UserModel, type UserDocument } from "../models/user.model.js";

export interface UpsertGoogleUserInput {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface UpsertDemoUserInput {
  email: string;
  name: string;
}

export const userRepository = {
  async findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).exec();
  },

  async findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  },

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return UserModel.findOne({ googleId }).exec();
  },

  async upsertGoogleUser(input: UpsertGoogleUserInput): Promise<UserDocument> {
    const email = input.email.toLowerCase();

    // Check if another user already has this email with a different googleId
    const existingWithEmail = await UserModel.findOne({ email }).exec();
    if (existingWithEmail && existingWithEmail.googleId !== input.googleId) {
      throw new ConflictError("An account with this email already exists");
    }

    try {
      const user = await UserModel.findOneAndUpdate(
        { googleId: input.googleId },
        {
          $set: {
            email,
            name: input.name,
            avatarUrl: input.avatarUrl,
            lastLoginAt: new Date(),
          },
          $setOnInsert: {
            googleId: input.googleId,
            isDemo: false,
            status: "active",
          },
        },
        { upsert: true, new: true, runValidators: true },
      ).exec();

      return user;
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ConflictError("An account with this email already exists");
      }
      throw err;
    }
  },

  async upsertDemoUser(input: UpsertDemoUserInput): Promise<UserDocument> {
    const email = input.email.toLowerCase();
    const user = await UserModel.findOneAndUpdate(
      { email, isDemo: true },
      {
        $set: {
          name: input.name,
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          email,
          isDemo: true,
          status: "active",
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();

    return user;
  },

  async updateStatus(id: string, status: "active" | "disabled"): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
  },
};
