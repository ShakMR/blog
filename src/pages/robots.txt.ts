import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '../lib/supabase/server';

const PRIVATE_DISALLOWS = ['/author', '/auth', '/me', '/draft', '/api'];

// AI/LLM crawlers that honour robots.txt. Stories whose author opted out of
// indexing are additionally disallowed for these agents.
const AI_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'Google-Extended',
  'CCBot',
  'PerplexityBot',
  'Applebot-Extended',
  'Bytespider',
];

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const supabase = createServerSupabaseClient();

  // Published-but-non-indexable stories: keep AI crawlers off them.
  const { data: optedOut } = await supabase
    .from('stories')
    .select('slug')
    .eq('status', 'published')
    .eq('indexable', false)
    .limit(1000);

  const optedOutPaths = (optedOut ?? []).map((story) => `/stories/${story.slug}`);

  const lines: string[] = [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_DISALLOWS.map((path) => `Disallow: ${path}`),
    '',
    // Ask AI crawlers to avoid private areas and any story opted out of indexing.
    ...AI_USER_AGENTS.map((agent) => `User-agent: ${agent}`),
    ...PRIVATE_DISALLOWS.map((path) => `Disallow: ${path}`),
    ...optedOutPaths.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${new URL('/sitemap.xml', origin).href}`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
