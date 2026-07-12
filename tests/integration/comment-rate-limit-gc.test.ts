import { describe, expect, it } from 'vitest';
import {
  COMMENT_RATE_LIMIT_WINDOW_SECONDS,
  purgeStaleCommentRateLimits,
} from '../../src/lib/comments/validation';
import { serviceClient } from './helpers/fixtures';

describe('purgeStaleCommentRateLimits', () => {
  it('deletes rows past the window and keeps recent ones', async () => {
    const now = new Date();
    const suffix = `${now.getTime()}`;
    const staleKey = `comments:gc-stale:${suffix}`;
    const freshKey = `comments:gc-fresh:${suffix}`;
    const staleTime = new Date(now.getTime() - (COMMENT_RATE_LIMIT_WINDOW_SECONDS + 3600) * 1000).toISOString();

    await serviceClient.from('comment_rate_limits').insert([
      { key: staleKey, attempt_count: 3, window_start: staleTime, updated_at: staleTime },
      { key: freshKey, attempt_count: 1, window_start: now.toISOString(), updated_at: now.toISOString() },
    ]);

    await purgeStaleCommentRateLimits(serviceClient, now);

    const stale = await serviceClient.from('comment_rate_limits').select('key').eq('key', staleKey).maybeSingle();
    const fresh = await serviceClient.from('comment_rate_limits').select('key').eq('key', freshKey).maybeSingle();

    expect(stale.data).toBeNull();
    expect(fresh.data?.key).toBe(freshKey);

    await serviceClient.from('comment_rate_limits').delete().eq('key', freshKey);
  });
});
