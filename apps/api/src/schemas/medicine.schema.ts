import { z } from "zod";

export const medicineAnchorEnum = z.enum(["breakfast", "lunch", "dinner", "bedtime"]);
export const withFoodEnum = z.enum(["before", "after", "with"]).nullable();

export const createMedicineSchema = z
  .object({
    name: z.string().trim().min(1, "Medicine name is required").max(150),
    strengthText: z.string().trim().min(1, "Strength is required").max(100),
    frequencyText: z.string().trim().min(1, "Frequency is required").max(100),
    anchors: z.array(medicineAnchorEnum).min(1, "At least one daily anchor time is required"),
    withFood: withFoodEnum.optional().default(null),
    notes: z.string().trim().max(500).optional().default(""),
    source: z.enum(["manual", "scan"]).optional().default("manual"),
  })
  .strict();

export const updateMedicineSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    strengthText: z.string().trim().min(1).max(100).optional(),
    frequencyText: z.string().trim().min(1).max(100).optional(),
    anchors: z.array(medicineAnchorEnum).min(1).optional(),
    withFood: withFoodEnum.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
