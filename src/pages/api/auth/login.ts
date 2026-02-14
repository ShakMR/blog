import type { APIRoute } from 'astro';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../../../lib/auth/session';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith('/')) {
    return '/author';
  }

  return value;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString().trim() ?? '';
  const password = formData.get('password')?.toString() ?? '';
  const next = getSafeRedirectTarget(formData.get('next')?.toString() ?? null);

  if (!email || !password) {
    return redirect('/auth/login?error=missing_credentials', 302);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return redirect('/auth/login?error=invalid_credentials', 302);
  }

  const maxAge = data.session.expires_in ?? 60 * 60;

  cookies.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge,
  });

  cookies.set(REFRESH_TOKEN_COOKIE, data.session.refresh_token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 30,
  });

  return redirect(next, 302);
};
