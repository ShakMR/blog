import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '../lib/supabase/server';

interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
}

function toIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Public, indexable surfaces only. Drafts (status = 'draft') are never selected,
// and private areas (/author, /auth, /me, /draft, /api) are intentionally absent.
export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const supabase = createServerSupabaseClient();

  const { data: stories } = await supabase
    .from('stories')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .eq('indexable', true)
    .order('published_at', { ascending: false })
    .limit(1000);

  const { data: authors } = await supabase.from('authors').select('slug, updated_at');

  const urls: SitemapUrl[] = [
    ...['/', '/stories', '/authors', '/about'].map((path) => ({ loc: new URL(path, origin).href })),
    ...(authors ?? []).map((author) => ({
      loc: new URL(`/authors/${author.slug}`, origin).href,
      lastmod: author.updated_at,
    })),
    ...(stories ?? []).map((story) => ({
      loc: new URL(`/stories/${story.slug}`, origin).href,
      lastmod: story.updated_at ?? story.published_at,
    })),
  ];

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((entry) => {
        const lastmod = toIso(entry.lastmod);
        return `  <url><loc>${entry.loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
      })
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
