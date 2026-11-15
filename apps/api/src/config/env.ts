import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from current directory or app folder
dotenv.config();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLIENT_ORIGIN: z.string().min(1, "CLIENT_ORIGIN is required"),
  AI_SERVICE_URL: z.string().url("AI_SERVICE_URL must be a valid URL"),
  AI_SERVICE_TOKEN: z
    .string()
    .min(32, "AI_SERVICE_TOKEN must be at least 32 characters long for security"),

  // Future phase optional vars
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GMAIL_CLIENT_EMAIL: z.string().email().optional(),
  GMAIL_PRIVATE_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  TICK_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process environment variables against the Zod schema.
 * Throws a human-readable formatted error listing all invalid variables if validation fails.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorMessages = result.error.errors.map(
      (err) => `  - ${err.path.join(".")}: ${err.message}`,
    );
    throw new Error(
      `Environment validation failed with ${result.error.errors.length} error(s):\n${errorMessages.join("\n")}`,
    );
  }

  return result.data;
}

export const env: Env = validateEnv(process.env);
