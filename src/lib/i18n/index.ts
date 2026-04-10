import type { AstroCookies } from 'astro';
import { siteConfig, type SupportedLocale } from '../../config/site';
import { messages } from './messages';

export const LOCALE_COOKIE = 'ui-locale';

export function isSupportedLocale(value: string): value is SupportedLocale {
  return siteConfig.locales.includes(value as SupportedLocale);
}

export function resolveLocale(pathname: string): SupportedLocale {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment && isSupportedLocale(firstSegment)
    ? firstSegment
    : siteConfig.defaultLocale;
}

export function getLocaleFromCookies(cookies: AstroCookies): SupportedLocale | null {
  const value = cookies.get(LOCALE_COOKIE)?.value;
  if (!value || !isSupportedLocale(value)) {
    return null;
  }
  return value;
}

export function resolveRequestLocale(cookies: AstroCookies, pathname: string): SupportedLocale {
  return getLocaleFromCookies(cookies) ?? resolveLocale(pathname);
}

export function getMessages(locale: SupportedLocale) {
  return messages[locale];
}
