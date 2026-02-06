import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  BROWSERBASE_API_KEY: z.string().min(1, "BROWSERBASE_API_KEY is required"),
  BROWSERBASE_PROJECT_ID: z.string().min(1, "BROWSERBASE_PROJECT_ID is required"),
  OWL_PRACTICE_URL: z.string().url("OWL_PRACTICE_URL must be a valid URL"),
  OWL_USERNAME: z.string().min(1, "OWL_USERNAME is required"),
  OWL_PASSWORD: z.string().min(1, "OWL_PASSWORD is required"),
  PLAYSPACE_URL: z.string().url("PLAYSPACE_URL must be a valid URL"),
  PLAYSPACE_USERNAME: z.string().min(1, "PLAYSPACE_USERNAME is required"),
  PLAYSPACE_PASSWORD: z.string().min(1, "PLAYSPACE_PASSWORD is required"),
  SYNC_INTERVAL_MINUTES: z.coerce.number().min(1).max(1440).default(60),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}
