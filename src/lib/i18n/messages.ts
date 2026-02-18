import type { SupportedLocale } from '../../config/site';
import { es, ca, en } from './lang';
import type { Messages } from './types';

export const messages: Record<SupportedLocale, Messages> = {
  es,
  ca,
  en,
};
