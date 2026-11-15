import { z } from "zod";

const webEnvSchema = z.object({
  MODE: z.string().default("development"),
  BASE_URL: z.string().default("/"),
  PROD: z.boolean().default(false),
  DEV: z.boolean().default(true),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

/**
 * Validates and provides typed access to client environment configuration.
 */
export function getWebEnv(): WebEnv {
  return webEnvSchema.parse({
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
  });
}

export const env: WebEnv = getWebEnv();
