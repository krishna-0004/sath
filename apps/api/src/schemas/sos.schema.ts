import { z } from "zod";

export const triggerSosSchema = z
  .object({
    locationText: z.string().trim().max(300).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    voiceNoteUrl: z.union([z.string().url(), z.literal("")]).optional(),
    voiceNoteTranscript: z.string().trim().max(1000).optional(),
  })
  .strict();

export type TriggerSosInput = z.infer<typeof triggerSosSchema>;
