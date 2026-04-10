import type { SupportedLocale } from '../../config/site';

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

export function toDateValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toPublicCoverUrl(coverPath: string | null | undefined): string | null {
  if (!coverPath) {
    return null;
  }

  const baseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/story-covers/${coverPath}`;
}

function toIntlLocale(locale: SupportedLocale): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'ca') return 'ca-ES';
  return 'es-ES';
}

export function formatDate(value: string | null, locale: SupportedLocale = 'es'): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

export function getStoryExcerpt(bodyHtml: string, maxLength = 140): string {
  const plain = bodyHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) {
    return '';
  }

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
