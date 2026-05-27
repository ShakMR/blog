import type { AstroCookies } from 'astro';
import type { User } from '@supabase/supabase-js';
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

export interface AuthSessionContext {
  user: User;
  profile: AuthorProfile | null;
}

export function getAccessTokenFromCookies(cookies: AstroCookies): string | null {
  return cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function isAuthorRole(role: UserRole): boolean {
  return role === 'author' || role === 'admin';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export async function getAuthenticatedUser(accessToken: string): Promise<User | null> {
  const authClient = createServerSupabaseClient({ accessToken });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function getAuthSessionContext(accessToken: string): Promise<AuthSessionContext | null> {
  const user = await getAuthenticatedUser(accessToken);
  if (!user) {
    return null;
  }

  const dbClient = createServerSupabaseClient({ accessToken });
  const { data: profile } = await dbClient
    .from('profiles')
    .select('id, role, display_name, locale')
    .eq('id', user.id)
    .maybeSingle<AuthorProfile>();

  return {
    user,
    profile: profile ?? null,
  };
}

export async function getAuthenticatedAuthorContext(accessToken: string) {
  const session = await getAuthSessionContext(accessToken);
  if (!session?.profile || !isAuthorRole(session.profile.role)) {
    return null;
  }

  return {
    user: session.user,
    profile: session.profile,
  };
}
