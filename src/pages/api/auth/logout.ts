import type { APIRoute } from 'astro';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../../../lib/auth/session';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const accessToken = cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const supabase = createServerSupabaseClient({ accessToken });
    await supabase.auth.signOut();
  }

  cookies.delete(ACCESS_TOKEN_COOKIE, { path: '/' });
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' });

  return redirect('/auth/login?status=logged_out', 302);
};
