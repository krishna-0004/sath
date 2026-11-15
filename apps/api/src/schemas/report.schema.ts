import { z } from "zod";

export const reportMetricSchema = z
  .object({
    name: z.string().trim().min(1, "Metric name is required").max(100),
    value: z.union([z.number(), z.string().trim().min(1)]),
    unit: z.string().trim().max(30).default(""),
    referenceRangeText: z.string().trim().max(100).default(""),
    flag: z.enum(["normal", "low", "high", "unknown"]).default("unknown"),
  })
  .strict();

export const reportPreviewSchema = z
  .object({
    uploadId: z.string().min(1, "uploadId is required"),
  })
  .strict();

export const createReportSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    testDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    labName: z.string().trim().max(150).optional().default(""),
    metrics: z.array(reportMetricSchema).min(1, "At least one metric is required"),
    fileUrl: z
      .union([z.string().url(), z.literal("")])
      .optional()
      .default(""),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

export type ReportMetricInput = z.infer<typeof reportMetricSchema>;
export type ReportPreviewInput = z.infer<typeof reportPreviewSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
