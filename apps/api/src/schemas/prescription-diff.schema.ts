import { z } from "zod";
import { medicineAnchorEnum } from "./medicine.schema.js";

export const withFoodTimingSchema = z
  .union([
    z.enum(["before", "after", "with"]).nullable(),
    z.boolean().transform((v) => (v ? "with" : null)),
  ])
  .optional()
  .default(null);

export const prescriptionPreviewSchema = z
  .object({
    uploadId: z.string().min(1, "uploadId is required"),
  })
  .strict();

export const proposedMedicineSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    strengthText: z.string().trim().max(50).default(""),
    frequencyText: z.string().trim().max(50).default(""),
    anchors: z.array(medicineAnchorEnum).min(1, "At least one anchor is required"),
    withFood: withFoodTimingSchema,
    instructions: z.string().max(300).default(""),
  })
  .strict();

export const proposedUpdateMedicineSchema = proposedMedicineSchema
  .extend({
    id: z.string().min(1, "Medicine ID is required"),
  })
  .strict();

export const prescriptionConfirmSchema = z
  .object({
    applyAdded: z.array(proposedMedicineSchema).default([]),
    applyUpdated: z.array(proposedUpdateMedicineSchema).default([]),
    stopDiscontinuedIds: z.array(z.string()).default([]),
  })
  .strict();

export type PrescriptionPreviewInput = z.infer<typeof prescriptionPreviewSchema>;
export type ProposedMedicine = z.infer<typeof proposedMedicineSchema>;
export type ProposedUpdateMedicine = z.infer<typeof proposedUpdateMedicineSchema>;
export type PrescriptionConfirmInput = z.infer<typeof prescriptionConfirmSchema>;
