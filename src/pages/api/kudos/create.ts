import type { APIRoute } from 'astro';
import { getClientIp, getSafeStorySlug } from '../../../lib/comments/validation';
import {
  createKudosClientToken,
  hashKudosClientToken,
  isKudosEnabled,
  isValidKudosClientToken,
  KUDOS_CLIENT_COOKIE,
  KUDOS_COOKIE_MAX_AGE_SECONDS,
  validateKudosSubmission,
} from '../../../lib/kudos/validation';
import { createServiceRoleClient } from '../../../lib/supabase/server';
import { withApiErrorHandling } from '../../../lib/http/responses';

function storyRedirect(slug: string, key: 'kudos_status' | 'kudos_error', value: string): string {
  const params = new URLSearchParams({ [key]: value });
  const safeSlug = getSafeStorySlug(slug);
  return safeSlug ? `/stories/${safeSlug}?${params.toString()}#kudos` : `/stories?${params.toString()}`;
}

function wantsJson(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

function kudosResponse(context: Parameters<APIRoute>[0], slug: string, ok: boolean, value: string, count = 0): Response {
  if (wantsJson(context.request)) {
    return Response.json({ ok, status: ok ? value : undefined, error: ok ? undefined : value, count }, { status: ok ? 200 : 400 });
  }

  return context.redirect(storyRedirect(slug, ok ? 'kudos_status' : 'kudos_error', value), 302);
}

export const POST: APIRoute = withApiErrorHandling(async (context) => {
  const origin = context.request.headers.get('origin');
  if (origin && origin !== context.url.origin) {
    return kudosResponse(context, '', false, 'invalid_origin');
  }

  const formData = await context.request.formData();
  const fallbackSlug = formData.get('storySlug')?.toString() ?? '';
  const payload = validateKudosSubmission({
    storyId: formData.get('storyId')?.toString() ?? '',
    storySlug: fallbackSlug,
  });

  if (!payload) {
    return kudosResponse(context, fallbackSlug, false, 'invalid_payload');
  }

  const serviceClient = createServiceRoleClient();
  const { data: story } = await serviceClient
    .from('stories')
    .select('id, slug, status, kudos_visibility')
    .eq('id', payload.storyId)
    .maybeSingle();

  if (!story || story.slug !== payload.storySlug || story.status !== 'published' || !isKudosEnabled(story.kudos_visibility)) {
    return kudosResponse(context, payload.storySlug, false, 'closed');
  }

  const existingToken = context.cookies.get(KUDOS_CLIENT_COOKIE)?.value;
  const token = isValidKudosClientToken(existingToken) ? existingToken : createKudosClientToken();
  context.cookies.set(KUDOS_CLIENT_COOKIE, token, {
    httpOnly: true,
    maxAge: KUDOS_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: context.url.protocol === 'https:',
  });

  const { error } = await serviceClient.from('story_kudos').insert({
    story_id: payload.storyId,
    client_hash: hashKudosClientToken(token),
    source_ip: getClientIp(context.request.headers),
    user_agent: context.request.headers.get('user-agent'),
  });

  if (error && error.code !== '23505') {
    return kudosResponse(context, payload.storySlug, false, 'submit_failed');
  }

  const { count = 0 } = await serviceClient
    .from('story_kudos')
    .select('id', { count: 'exact', head: true })
    .eq('story_id', payload.storyId);

  return kudosResponse(context, payload.storySlug, true, 'sent', count ?? 0);
}, (context) => kudosResponse(context, '', false, 'submit_failed'));
