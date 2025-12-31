import { z } from 'zod';

export const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  RATE_LIMIT_PUBLIC: z.string().optional(),
  RATE_LIMIT_AUTH: z.string().optional(),
  RATE_LIMIT_BOOKING: z.string().optional(),
  RATE_LIMIT_ADMIN: z.string().optional()
});

export function validateEnv(env: NodeJS.ProcessEnv = process.env) {
  return envSchema.parse(env);
}
