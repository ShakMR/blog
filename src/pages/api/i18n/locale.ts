import type { APIRoute } from 'astro';
import { isSupportedLocale, LOCALE_COOKIE } from '../../../lib/i18n';

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith('/')) {
    return '/';
  }
  return value;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const locale = formData.get('locale')?.toString() ?? '';
  const next = getSafeRedirectTarget(formData.get('next')?.toString() ?? null);

  if (!isSupportedLocale(locale)) {
    return redirect(next, 302);
  }

  cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });

  return redirect(next, 302);
};
