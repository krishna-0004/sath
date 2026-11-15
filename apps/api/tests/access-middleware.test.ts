import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { requireProfileMember } from "../src/middleware/require-profile-member.js";
import { requireProfileRole } from "../src/middleware/require-profile-role.js";
import { requireCategory } from "../src/middleware/require-category.js";
import {
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../src/errors/http-errors.js";

describe("Care Core Access Middleware", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("requireProfileMember", () => {
    it("throws UnauthenticatedError when req.auth is missing", async () => {
      const req = {
        params: { profileId: new mongoose.Types.ObjectId().toString() },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await expect(requireProfileMember(req, res, next)).rejects.toThrow(UnauthenticatedError);
    });

    it("throws ValidationError when profileId is invalid hex", async () => {
      const req = {
        auth: { userId: new mongoose.Types.ObjectId().toString() },
        params: { profileId: "invalid-id" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await expect(requireProfileMember(req, res, next)).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when profile does not exist", async () => {
      const req = {
        auth: { userId: new mongoose.Types.ObjectId().toString() },
        params: { profileId: new mongoose.Types.ObjectId().toString() },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await expect(requireProfileMember(req, res, next)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError (IDOR prevention) when user is not a member of existing profile", async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const profile = await ProfileModel.create({
        elderName: "Elder A",
        joinCode: "ABC123DEF4",
        passcodeHash: "hash",
        createdBy: ownerId,
      });

      const strangerId = new mongoose.Types.ObjectId().toString();
      const req = {
        auth: { userId: strangerId },
        params: { profileId: profile._id.toString() },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await expect(requireProfileMember(req, res, next)).rejects.toThrow(NotFoundError);
      expect(next).not.toHaveBeenCalled();
    });

    it("attaches req.profile and req.membership and calls next for active members", async () => {
      const memberUserId = new mongoose.Types.ObjectId().toString();
      const profile = await ProfileModel.create({
        elderName: "Elder B",
        joinCode: "XYZ987LKJ6",
        passcodeHash: "hash",
        createdBy: memberUserId,
      });

      const membership = await MembershipModel.create({
        profileId: profile._id,
        userId: memberUserId,
        role: "elder",
        status: "active",
      });

      const req = {
        auth: { userId: memberUserId },
        params: { profileId: profile._id.toString() },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await requireProfileMember(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.profile?.elderName).toBe("Elder B");
      expect(req.membership?.role).toBe("elder");
      expect(req.membership?._id.toString()).toBe(membership._id.toString());
    });
  });

  describe("requireProfileRole", () => {
    it("allows execution when caller has an allowed role", () => {
      const middleware = requireProfileRole("elder", "editor");
      const req = {
        auth: { userId: "user-123" },
        membership: { role: "editor" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenError when caller has an unauthorized role", () => {
      const middleware = requireProfileRole("elder");
      const req = {
        auth: { userId: "user-123" },
        membership: { role: "viewer" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireCategory", () => {
    it("allows elder or editor to view category even when sharing toggle is false", () => {
      const middleware = requireCategory("reports");
      const req = {
        auth: { userId: "user-123" },
        membership: { role: "elder" },
        profile: { sharing: { medicines: true, reports: false, appointments: true } },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("allows viewer to view category when sharing toggle is true", () => {
      const middleware = requireCategory("medicines");
      const req = {
        auth: { userId: "user-123" },
        membership: { role: "viewer" },
        profile: { sharing: { medicines: true, reports: false, appointments: true } },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("blocks viewer with NotFoundError when sharing toggle is false", () => {
      const middleware = requireCategory("reports");
      const req = {
        auth: { userId: "user-123" },
        membership: { role: "viewer" },
        profile: { sharing: { medicines: true, reports: false, appointments: true } },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      expect(() => middleware(req, res, next)).toThrow(NotFoundError);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
