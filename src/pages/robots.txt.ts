import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /author',
    'Disallow: /auth',
    'Disallow: /me',
    'Disallow: /draft',
    'Disallow: /api',
    '',
    `Sitemap: ${new URL('/sitemap.xml', url.origin).href}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
