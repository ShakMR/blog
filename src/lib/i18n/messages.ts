import type { SupportedLocale } from '../../config/site';
import { es, ca, en } from './lang';

export const messages = {
  es,
  ca,
  en,
} as const satisfies Record<SupportedLocale, unknown>;
