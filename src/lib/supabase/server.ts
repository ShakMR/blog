import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, getServerSupabaseEnv } from './env';

export function createServerSupabaseClient() {
  const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();

  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

export function createServiceRoleClient() {
  const { PUBLIC_SUPABASE_URL } = getPublicSupabaseEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerSupabaseEnv();

  return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
