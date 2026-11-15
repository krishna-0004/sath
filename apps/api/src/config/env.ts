import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from current directory or app folder
dotenv.config();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../.env") });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    MONGODB_URI: z
      .string({ required_error: "MONGODB_URI is required" })
      .min(1, "MONGODB_URI is required"),
    CLIENT_ORIGIN: z
      .string({ required_error: "CLIENT_ORIGIN is required" })
      .min(1, "CLIENT_ORIGIN is required"),
    AI_SERVICE_URL: z
      .string({ required_error: "AI_SERVICE_URL is required" })
      .url("AI_SERVICE_URL must be a valid URL"),
    AI_SERVICE_TOKEN: z
      .string({ required_error: "AI_SERVICE_TOKEN is required" })
      .min(32, "AI_SERVICE_TOKEN must be at least 32 characters long for security"),

    // Phase 1 Authentication
    GOOGLE_CLIENT_ID: z
      .string({ required_error: "GOOGLE_CLIENT_ID is required" })
      .min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z
      .string({ required_error: "GOOGLE_CLIENT_SECRET is required" })
      .min(1, "GOOGLE_CLIENT_SECRET is required"),
    GOOGLE_CALLBACK_URL: z
      .string({ required_error: "GOOGLE_CALLBACK_URL is required" })
      .url("GOOGLE_CALLBACK_URL must be a valid URL"),
    JWT_ACCESS_SECRET: z
      .string({ required_error: "JWT_ACCESS_SECRET is required" })
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long"),
    COOKIE_SECRET: z
      .string({ required_error: "COOKIE_SECRET is required" })
      .min(32, "COOKIE_SECRET must be at least 32 characters long"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    REFRESH_REUSE_LEEWAY_SECONDS: z.coerce.number().int().nonnegative().default(10),
    DEMO_LOGIN_ENABLED: z
      .preprocess((val) => val === true || val === "true", z.boolean())
      .default(false),

    // Phases 2–5 Care Core, Documents, SOS, Email
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
    EMAIL_PROVIDER: z.enum(["gmail", "log"]).default("log"),
    GMAIL_SENDER: z.string().optional(),
    GMAIL_REFRESH_TOKEN: z.string().optional(),
    SHARE_LINK_TTL_HOURS: z.coerce.number().int().positive().default(24),
  })
  .refine((data) => data.COOKIE_SECRET !== data.JWT_ACCESS_SECRET, {
    message: "COOKIE_SECRET must not equal JWT_ACCESS_SECRET",
    path: ["COOKIE_SECRET"],
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === "production" && data.EMAIL_PROVIDER === "log") {
        return false;
      }
      return true;
    },
    {
      message: "EMAIL_PROVIDER='log' is refused when NODE_ENV=production",
      path: ["EMAIL_PROVIDER"],
    },
  )
  .refine(
    (data) => {
      if (data.EMAIL_PROVIDER === "gmail") {
        return Boolean(data.GMAIL_SENDER && data.GMAIL_REFRESH_TOKEN);
      }
      return true;
    },
    {
      message: "GMAIL_SENDER and GMAIL_REFRESH_TOKEN are required when EMAIL_PROVIDER=gmail",
      path: ["GMAIL_SENDER"],
    },
  );

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
