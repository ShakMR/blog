import { z } from 'zod';

const publicEnvSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function getPublicSupabaseEnv() {
  return publicEnvSchema.parse(import.meta.env);
}

export function getServerSupabaseEnv() {
  return serverEnvSchema.parse(import.meta.env);
}
