import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  SESSION_COOKIE_NAME: z.string().default('ivc_session'),
  /** Public base for image URLs (no trailing slash). Dev default serves /storage/media */
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  LOCAL_STORAGE_DIR: z.string().default('.data/ivc-uploads'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('ivc-images'),
  R2_ENDPOINT: z.string().url().optional(),
});

const parsed = envSchema.parse(process.env);

const r2Configured =
  Boolean(parsed.R2_ACCESS_KEY_ID) &&
  Boolean(parsed.R2_SECRET_ACCESS_KEY) &&
  Boolean(parsed.R2_ENDPOINT);

const defaultPublicBase = `http://localhost:${parsed.PORT}/storage/media`;

export const env = {
  ...parsed,
  storageMode: r2Configured ? ('r2' as const) : ('local' as const),
  storagePublicBaseUrl: (parsed.STORAGE_PUBLIC_BASE_URL ?? defaultPublicBase).replace(/\/$/, ''),
};
