import { z } from "zod";

export const recordDoseSchema = z
  .object({
    status: z.enum(["taken", "spilled", "skipped"]),
    reasonText: z.string().trim().max(300).optional().default(""),
  })
  .strict();

export const doseSummaryQuerySchema = z
  .object({
    days: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => val >= 1 && val <= 30, {
        message: "days must be between 1 and 30",
      })
      .default("7"),
  })
  .strict();

export type RecordDoseInput = z.infer<typeof recordDoseSchema>;
export type DoseSummaryQueryInput = z.infer<typeof doseSummaryQuerySchema>;
