import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  DATABASE_URL:             z.string().min(1),
  JWT_ACCESS_SECRET:        z.string().min(32),
  JWT_REFRESH_SECRET:       z.string().min(32),
  JWT_ACCESS_EXPIRES_IN:    z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN:   z.string().default('7d'),
  PORT:                     z.string().default('5000'),
  NODE_ENV:                 z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL:               z.string().url().default('http://localhost:3000'),
  STORAGE_PROVIDER:               z.enum(['local', 'cloudinary', 'supabase']).default('local'),
  CLOUDINARY_CLOUD_NAME:          z.string().optional(),
  CLOUDINARY_API_KEY:             z.string().optional(),
  CLOUDINARY_API_SECRET:          z.string().optional(),
  SUPABASE_S3_ACCESS_KEY_ID:      z.string().optional(),
  SUPABASE_S3_SECRET_ACCESS_KEY:  z.string().optional(),
  SUPABASE_S3_ENDPOINT:           z.string().optional(),
  SUPABASE_S3_REGION:             z.string().optional(),
  SUPABASE_STORAGE_BUCKET:        z.string().default('clearance-documents'),
  CACHE_PROVIDER:                 z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL:                      z.string().optional(),
  EMAIL_PROVIDER:                 z.enum(['mailpit', 'resend', 'gmail']).default('mailpit'),
  EMAIL_FROM:                     z.string().default('UniClear <noreply@uniclear.ng>'),
  SMTP_HOST:                      z.string().default('localhost'),
  SMTP_PORT:                      z.coerce.number().default(1025),
  RESEND_API_KEY:                 z.string().optional(),
  GOOGLE_CLIENT_ID:               z.string().optional(),
  GOOGLE_CLIENT_SECRET:           z.string().optional(),
  GMAIL_REFRESH_TOKEN:            z.string().optional(),
  APP_URL:                        z.string().url().default('http://localhost:3000'),
}).refine(
  data => data.STORAGE_PROVIDER !== 'cloudinary' || (
    !!data.CLOUDINARY_CLOUD_NAME && !!data.CLOUDINARY_API_KEY && !!data.CLOUDINARY_API_SECRET
  ),
  { message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required when STORAGE_PROVIDER=cloudinary' }
).refine(
  data => data.STORAGE_PROVIDER !== 'supabase' || (
    !!data.SUPABASE_S3_ACCESS_KEY_ID && !!data.SUPABASE_S3_SECRET_ACCESS_KEY
  ),
  { message: 'SUPABASE_S3_ACCESS_KEY_ID and SUPABASE_S3_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER=supabase' }
).refine(
  data => data.EMAIL_PROVIDER !== 'gmail' || (
    !!data.GOOGLE_CLIENT_ID && !!data.GOOGLE_CLIENT_SECRET && !!data.GMAIL_REFRESH_TOKEN
  ),
  { message: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are required when EMAIL_PROVIDER=gmail' }
).refine(
  data => data.EMAIL_PROVIDER !== 'resend' || !!data.RESEND_API_KEY,
  { message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend' }
)

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
