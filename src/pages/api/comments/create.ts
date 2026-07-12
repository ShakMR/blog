import type { APIRoute } from 'astro';
import {
  buildRateLimitKey,
  getClientIp,
  getNextRateLimitState,
  getSafeStorySlug,
  purgeStaleCommentRateLimits,
  validateCommentSubmission,
} from '../../../lib/comments/validation';
import type { CommentRateLimitState, CommentSubmissionError } from '../../../lib/comments/types';
import { verifyChallenge } from '../../../lib/comments/challenge';
import { createServiceRoleClient } from '../../../lib/supabase/server';
import { withApiErrorHandling } from '../../../lib/http/responses';

function storyRedirect(slug: string, key: 'comment_status' | 'comment_error', value: string): string {
  const params = new URLSearchParams({ [key]: value });
  const safeSlug = getSafeStorySlug(slug);
  return safeSlug ? `/stories/${safeSlug}?${params.toString()}#comments` : `/stories?${params.toString()}`;
}

export const POST: APIRoute = withApiErrorHandling(async (context) => {
  const formData = await context.request.formData();
  const parsed = validateCommentSubmission({
    storyId: formData.get('storyId')?.toString() ?? '',
    storySlug: formData.get('storySlug')?.toString() ?? '',
    authorName: formData.get('authorName')?.toString() ?? '',
    body: formData.get('body')?.toString() ?? '',
    website: formData.get('website')?.toString() ?? '',
    startedAt: Number(formData.get('startedAt')?.toString() ?? 0),
    challengeAnswer: formData.get('challengeAnswer')?.toString() ?? '',
    challengeToken: formData.get('challengeToken')?.toString() ?? '',
  });

  const fallbackSlug = formData.get('storySlug')?.toString() || '';
  if (!parsed.success || !parsed.data) {
    return context.redirect(storyRedirect(fallbackSlug, 'comment_error', parsed.error ?? 'invalid_payload'), 302);
  }

  const payload = parsed.data;

  if (!verifyChallenge(payload.challengeAnswer, payload.challengeToken)) {
    return context.redirect(storyRedirect(payload.storySlug, 'comment_error', 'challenge_failed'), 302);
  }

  const serviceClient = createServiceRoleClient();
  const { data: story } = await serviceClient
    .from('stories')
    .select('id, slug, status, comments_enabled')
    .eq('id', payload.storyId)
    .maybeSingle();

  if (!story || story.slug !== payload.storySlug || story.status !== 'published' || !story.comments_enabled) {
    return context.redirect(storyRedirect(payload.storySlug, 'comment_error', 'comments_closed'), 302);
  }

  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = buildRateLimitKey(payload.storyId, clientIp);
  const { data: existingRateLimit } = await serviceClient
    .from('comment_rate_limits')
    .select('attempt_count, window_start')
    .eq('key', rateLimitKey)
    .maybeSingle();

  const nextRateLimit = getNextRateLimitState(existingRateLimit as CommentRateLimitState | null);

  await serviceClient.from('comment_rate_limits').upsert({
    key: rateLimitKey,
    attempt_count: nextRateLimit.state.attempt_count,
    window_start: nextRateLimit.state.window_start,
    updated_at: new Date().toISOString(),
  });

  if (!nextRateLimit.allowed) {
    return context.redirect(storyRedirect(payload.storySlug, 'comment_error', 'rate_limited'), 302);
  }

  const { error } = await serviceClient.from('comments').insert({
    story_id: payload.storyId,
    author_name: payload.authorName,
    body: payload.body,
    source_ip: clientIp,
    user_agent: context.request.headers.get('user-agent'),
  });

  if (error) {
    return context.redirect(storyRedirect(payload.storySlug, 'comment_error', 'submit_failed' satisfies CommentSubmissionError), 302);
  }

  // Opportunistic housekeeping so the rate-limit table stays bounded.
  await purgeStaleCommentRateLimits(serviceClient);

  return context.redirect(storyRedirect(payload.storySlug, 'comment_status', 'posted'), 302);
}, (context) => context.redirect('/stories?comment_error=submit_failed', 302));
