import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    title: z.string().trim().min(1, "Appointment title is required").max(150),
    doctorName: z.string().trim().min(1, "Doctor name is required").max(100),
    location: z.string().trim().max(200).optional().default(""),
    startsAt: z.string().datetime({ message: "startsAt must be a valid ISO 8601 string" }),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

export const updateAppointmentSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    doctorName: z.string().trim().min(1).max(100).optional(),
    location: z.string().trim().max(200).optional(),
    startsAt: z.string().datetime().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
