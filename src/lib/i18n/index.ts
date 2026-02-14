import { siteConfig, type SupportedLocale } from '../../config/site';
import { messages } from './messages';

export function isSupportedLocale(value: string): value is SupportedLocale {
  return siteConfig.locales.includes(value as SupportedLocale);
}

export function resolveLocale(pathname: string): SupportedLocale {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment && isSupportedLocale(firstSegment)
    ? firstSegment
    : siteConfig.defaultLocale;
}

export function getMessages(locale: SupportedLocale) {
  return messages[locale];
}
