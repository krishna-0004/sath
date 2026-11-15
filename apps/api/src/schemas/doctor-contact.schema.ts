import { z } from "zod";

export const doctorContactKindEnum = z.enum(["family_doctor", "emergency_doctor"]);

export const createDoctorContactSchema = z
  .object({
    kind: doctorContactKindEnum,
    name: z.string().trim().min(1, "Doctor name is required").max(100),
    email: z.string().trim().email("Valid email required").max(120),
    whatsappNumber: z
      .string()
      .trim()
      .min(8, "Valid phone number required")
      .max(25, "Phone number too long"),
  })
  .strict();

export type CreateDoctorContactInput = z.infer<typeof createDoctorContactSchema>;
