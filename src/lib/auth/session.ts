import type { AstroCookies } from 'astro';
import type { Database } from '../../types/database';
import { createServerSupabaseClient } from '../supabase/server';

export const ACCESS_TOKEN_COOKIE = 'sb-access-token';
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';

export type UserRole = Database['public']['Tables']['profiles']['Row']['role'];
export interface AuthorProfile {
  id: string;
  role: UserRole;
  display_name: string;
  locale: string;
}

export function getAccessTokenFromCookies(cookies: AstroCookies): string | null {
  return cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function isAuthorRole(role: UserRole): boolean {
  return role === 'author' || role === 'admin';
}

export async function getAuthenticatedAuthorContext(accessToken: string) {
  const authClient = createServerSupabaseClient({ accessToken });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return null;
  }

  const dbClient = createServerSupabaseClient({ accessToken });
  const { data: profile, error: profileError } = await dbClient
    .from('profiles')
    .select('id, role, display_name, locale')
    .eq('id', userData.user.id)
    .single<AuthorProfile>();

  if (profileError || !profile || !isAuthorRole(profile.role)) {
    return null;
  }

  return {
    user: userData.user,
    profile,
  };
}
