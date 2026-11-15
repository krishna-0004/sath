import { z } from "zod";

const webEnvSchema = z.object({
  MODE: z.string().default("development"),
  BASE_URL: z.string().default("/"),
  PROD: z.boolean().default(false),
  DEV: z.boolean().default(true),
  VITE_DEMO_LOGIN_ENABLED: z.string().default("false"),
  VITE_API_BASE_URL: z.string().default(""),
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
    VITE_DEMO_LOGIN_ENABLED: import.meta.env.VITE_DEMO_LOGIN_ENABLED,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  });
}

export const env: WebEnv = getWebEnv();
