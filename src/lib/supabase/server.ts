import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, getServerSupabaseEnv } from './env';

interface ServerClientOptions {
  accessToken?: string;
}

export function createServerSupabaseClient(options: ServerClientOptions = {}) {
  const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();

  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: options.accessToken
      ? {
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
          },
        }
      : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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
