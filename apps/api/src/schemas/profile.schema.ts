import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const anchorTimesSchema = z
  .object({
    breakfast: z.string().regex(TIME_REGEX, "Must be HH:MM format").default("08:00"),
    lunch: z.string().regex(TIME_REGEX, "Must be HH:MM format").default("13:00"),
    dinner: z.string().regex(TIME_REGEX, "Must be HH:MM format").default("20:00"),
    bedtime: z.string().regex(TIME_REGEX, "Must be HH:MM format").default("22:00"),
  })
  .strict();

export const createProfileSchema = z
  .object({
    elderName: z.string().trim().min(1, "Elder name is required").max(100),
    passcode: z
      .string()
      .trim()
      .min(6, "Passcode must be at least 6 characters")
      .max(12, "Passcode cannot exceed 12 characters"),
    timezone: z.string().trim().default("Asia/Kolkata"),
    anchorTimes: anchorTimesSchema.optional(),
    emergencyPhone: z.string().trim().max(30).nullable().optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    elderName: z.string().trim().min(1).max(100).optional(),
    timezone: z.string().trim().optional(),
    anchorTimes: anchorTimesSchema.optional(),
    emergencyPhone: z.string().trim().max(30).nullable().optional(),
  })
  .strict();

export const joinProfileSchema = z
  .object({
    joinCode: z.string().trim().min(4).max(20),
    passcode: z.string().trim().min(6).max(12),
  })
  .strict();

export const rotatePasscodeSchema = z
  .object({
    passcode: z
      .string()
      .trim()
      .min(6, "Passcode must be at least 6 characters")
      .max(12, "Passcode cannot exceed 12 characters"),
  })
  .strict();

export const updateSharingSchema = z
  .object({
    medicines: z.boolean().optional(),
    reports: z.boolean().optional(),
    appointments: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.medicines !== undefined || data.reports !== undefined || data.appointments !== undefined,
    { message: "At least one sharing setting must be specified" },
  );

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(["elder", "editor", "viewer"]),
  })
  .strict();

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type JoinProfileInput = z.infer<typeof joinProfileSchema>;
export type RotatePasscodeInput = z.infer<typeof rotatePasscodeSchema>;
export type UpdateSharingInput = z.infer<typeof updateSharingSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
