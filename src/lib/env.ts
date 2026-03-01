import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Prefer .env.local values over any inherited shell env vars.
// This helps avoid accidental use of a different OPENAI_API_KEY.
loadEnv({ path: ".env.local", override: true });

const normalizeEnv = (value?: string) => {
  if (!value) return value;
  const trimmed = value.trim();
  return trimmed.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
};

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_REASONING_EFFORT: z.enum(["low", "medium", "high"]).optional(),
  NOTION_API_KEY: z.string().optional(),
  NOTION_PAGE_ID: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
});

export const env = envSchema.parse({
  OPENAI_API_KEY: normalizeEnv(process.env.OPENAI_API_KEY),
  OPENAI_MODEL: normalizeEnv(process.env.OPENAI_MODEL),
  OPENAI_REASONING_EFFORT: normalizeEnv(process.env.OPENAI_REASONING_EFFORT),
  NOTION_API_KEY: normalizeEnv(process.env.NOTION_API_KEY),
  NOTION_PAGE_ID: normalizeEnv(process.env.NOTION_PAGE_ID),

  GOOGLE_CLIENT_ID: normalizeEnv(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: normalizeEnv(process.env.GOOGLE_CLIENT_SECRET),
  GOOGLE_API_KEY: normalizeEnv(process.env.GOOGLE_API_KEY),
  GOOGLE_REDIRECT_URI: normalizeEnv(process.env.GOOGLE_REDIRECT_URI),
});
