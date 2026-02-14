import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from './env';

export function createBrowserSupabaseClient() {
  const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();

  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
