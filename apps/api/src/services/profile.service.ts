import {
  ConflictError,
  JoinInvalidError,
  JoinLockedError,
  NotFoundError,
} from "../errors/http-errors.js";
import { type ProfileRole, type MembershipDocument } from "../models/membership.model.js";
import { type ProfileDocument } from "../models/profile.model.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { joinAttemptRepository } from "../repositories/join-attempt.repository.js";
import { medicineRepository } from "../repositories/medicine.repository.js";
import { doseEventRepository } from "../repositories/dose-event.repository.js";
import { appointmentRepository } from "../repositories/appointment.repository.js";
import { doctorContactRepository } from "../repositories/doctor-contact.repository.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { generateJoinCode, hashPasscode, verifyPasscode } from "../utils/passcode.util.js";
import type {
  CreateProfileInput,
  UpdateProfileInput,
  UpdateSharingInput,
} from "../schemas/profile.schema.js";

export const profileService = {
  async createProfile(
    userId: string,
    input: CreateProfileInput,
    requestId?: string,
  ): Promise<{ profile: ProfileDocument; membership: MembershipDocument }> {
    // Generate unique join code
    let joinCode = generateJoinCode();
    let collisionCheck = await profileRepository.findByJoinCode(joinCode);
    while (collisionCheck) {
      joinCode = generateJoinCode();
      collisionCheck = await profileRepository.findByJoinCode(joinCode);
    }

    const passcodeHash = await hashPasscode(input.passcode);

    const profile = await profileRepository.create({
      elderName: input.elderName,
      joinCode,
      passcodeHash,
      timezone: input.timezone,
      anchorTimes: input.anchorTimes,
      emergencyPhone: input.emergencyPhone ?? null,
      createdBy: userId,
    });

    const membership = await membershipRepository.create({
      profileId: profile.id,
      userId,
      role: "elder",
      status: "active",
    });

    await auditEventRepository.create({
      actorUserId: userId,
      action: "profile.created",
      outcome: "success",
      metadata: { profileId: profile.id, elderName: profile.elderName },
      requestId: requestId ?? null,
    });

    return { profile, membership };
  },

  async listProfilesForUser(userId: string): Promise<
    Array<{
      profile: ProfileDocument;
      role: ProfileRole;
      joinedAt: Date;
    }>
  > {
    const memberships = await membershipRepository.findActiveByUser(userId);
    const result: Array<{
      profile: ProfileDocument;
      role: ProfileRole;
      joinedAt: Date;
    }> = [];

    for (const m of memberships) {
      if (m.profileId && typeof m.profileId === "object" && "elderName" in m.profileId) {
        result.push({
          profile: m.profileId as unknown as ProfileDocument,
          role: m.role,
          joinedAt: m.joinedAt,
        });
      }
    }

    return result;
  },

  async getProfileById(profileId: string): Promise<ProfileDocument> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }
    return profile;
  },

  async updateProfile(profileId: string, input: UpdateProfileInput): Promise<ProfileDocument> {
    const updated = await profileRepository.update(profileId, {
      elderName: input.elderName,
      timezone: input.timezone,
      anchorTimes: input.anchorTimes,
      emergencyPhone: input.emergencyPhone,
    });

    if (!updated) {
      throw new NotFoundError("Profile not found");
    }

    return updated;
  },

  async rotatePasscode(
    profileId: string,
    newPasscode: string,
    actorUserId: string,
    requestId?: string,
  ): Promise<void> {
    const passcodeHash = await hashPasscode(newPasscode);
    const updated = await profileRepository.updatePasscode(profileId, passcodeHash);
    if (!updated) {
      throw new NotFoundError("Profile not found");
    }

    await auditEventRepository.create({
      actorUserId,
      action: "passcode.rotated",
      outcome: "success",
      metadata: { profileId },
      requestId: requestId ?? null,
    });
  },

  async joinProfile(
    userId: string,
    joinCode: string,
    passcode: string,
    requestId?: string,
  ): Promise<{ profile: ProfileDocument; membership: MembershipDocument; alreadyMember: boolean }> {
    const normalizedCode = joinCode.trim().toUpperCase();

    // Check lockout threshold
    const isLocked = await joinAttemptRepository.isLocked(userId, normalizedCode);
    if (isLocked) {
      throw new JoinLockedError("Too many failed attempts. Try again in 15 minutes");
    }

    const profile = await profileRepository.findByJoinCode(normalizedCode);
    if (!profile) {
      await joinAttemptRepository.recordFailure(userId, normalizedCode);
      throw new JoinInvalidError("Invalid join code or passcode");
    }

    const isMatch = await verifyPasscode(passcode, profile.passcodeHash);
    if (!isMatch) {
      const failResult = await joinAttemptRepository.recordFailure(userId, normalizedCode);
      if (failResult.locked) {
        throw new JoinLockedError("Too many failed attempts. Try again in 15 minutes");
      }
      throw new JoinInvalidError("Invalid join code or passcode");
    }

    // Success -> reset attempts
    await joinAttemptRepository.resetAttempt(userId, normalizedCode);

    // Check existing membership
    const existing = await membershipRepository.findByProfileAndUser(profile.id, userId);
    if (existing && existing.status === "active") {
      return { profile, membership: existing, alreadyMember: true };
    }

    let membership: MembershipDocument;
    if (existing) {
      existing.status = "active";
      existing.role = "viewer";
      await existing.save();
      membership = existing;
    } else {
      membership = await membershipRepository.create({
        profileId: profile.id,
        userId,
        role: "viewer",
        status: "active",
      });
    }

    await auditEventRepository.create({
      actorUserId: userId,
      action: "member.joined",
      outcome: "success",
      metadata: { profileId: profile.id, role: membership.role },
      requestId: requestId ?? null,
    });

    return { profile, membership, alreadyMember: false };
  },

  async listMembers(profileId: string): Promise<MembershipDocument[]> {
    return membershipRepository.findActiveByProfile(profileId);
  },

  async updateMemberRole(
    profileId: string,
    targetUserId: string,
    newRole: ProfileRole,
    actorUserId: string,
    requestId?: string,
  ): Promise<MembershipDocument> {
    const existing = await membershipRepository.findActiveByProfileAndUser(profileId, targetUserId);

    if (!existing) {
      throw new NotFoundError("Member not found in profile");
    }

    // Prevent demoting last active elder
    if (existing.role === "elder" && newRole !== "elder") {
      const activeElders = await membershipRepository.countActiveElders(profileId);
      if (activeElders <= 1) {
        throw new ConflictError("Cannot demote the only elder of this profile");
      }
    }

    const updated = await membershipRepository.updateRole(profileId, targetUserId, newRole);
    if (!updated) {
      throw new NotFoundError("Member not found in profile");
    }

    await auditEventRepository.create({
      actorUserId,
      action: "member.role_changed",
      outcome: "success",
      metadata: { profileId, targetUserId, newRole },
      requestId: requestId ?? null,
    });

    return updated;
  },

  async removeMember(
    profileId: string,
    targetUserId: string,
    actorUserId: string,
    requestId?: string,
  ): Promise<void> {
    const existing = await membershipRepository.findActiveByProfileAndUser(profileId, targetUserId);

    if (!existing) {
      throw new NotFoundError("Member not found in profile");
    }

    // Prevent removing the only elder
    if (existing.role === "elder") {
      const activeElders = await membershipRepository.countActiveElders(profileId);
      if (activeElders <= 1) {
        throw new ConflictError("Cannot remove the only elder of this profile");
      }
    }

    await membershipRepository.revoke(profileId, targetUserId);

    await auditEventRepository.create({
      actorUserId,
      action: "member.removed",
      outcome: "success",
      metadata: { profileId, targetUserId },
      requestId: requestId ?? null,
    });
  },

  async updateSharing(
    profileId: string,
    actorUserId: string,
    input: UpdateSharingInput,
    requestId?: string,
  ): Promise<ProfileDocument> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const newSharing = {
      medicines: input.medicines ?? profile.sharing.medicines,
      reports: input.reports ?? profile.sharing.reports,
      appointments: input.appointments ?? profile.sharing.appointments,
    };

    const updated = await profileRepository.update(profileId, { sharing: newSharing });
    if (!updated) {
      throw new NotFoundError("Profile not found");
    }

    await auditEventRepository.create({
      actorUserId,
      action: "sharing.changed",
      outcome: "success",
      metadata: { profileId, sharing: newSharing },
      requestId: requestId ?? null,
    });

    return updated;
  },

  async deleteProfile(profileId: string, actorUserId: string, requestId?: string): Promise<void> {
    await Promise.all([
      profileRepository.deleteById(profileId),
      membershipRepository.deleteByProfileId(profileId),
      medicineRepository.deleteByProfileId(profileId),
      doseEventRepository.deleteByProfileId(profileId),
      appointmentRepository.deleteByProfileId(profileId),
      doctorContactRepository.deleteByProfileId(profileId),
    ]);

    await auditEventRepository.create({
      actorUserId,
      action: "data.deleted",
      outcome: "success",
      metadata: { profileId, cascade: true },
      requestId: requestId ?? null,
    });
  },
};
