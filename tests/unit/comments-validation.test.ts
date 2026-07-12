import { describe, expect, it } from 'vitest';
import {
  buildRateLimitKey,
  COMMENT_MIN_SUBMIT_SECONDS,
  COMMENT_RATE_LIMIT_MAX_ATTEMPTS,
  COMMENT_RATE_LIMIT_WINDOW_SECONDS,
  getClientIp,
  getNextRateLimitState,
  getSafeStorySlug,
  validateCommentSubmission,
} from '../../src/lib/comments/validation';

const baseInput = {
  storyId: '11111111-1111-4111-8111-111111111111',
  storySlug: 'published-story',
  authorName: 'Reader',
  body: 'A thoughtful comment.',
  website: '',
  startedAt: Date.now() - (COMMENT_MIN_SUBMIT_SECONDS + 1) * 1000,
  challengeAnswer: '5',
  challengeToken: 'exp.signature',
};

describe('comment validation', () => {
  it('accepts a valid anonymous comment', () => {
    const result = validateCommentSubmission(baseInput);

    expect(result.success).toBe(true);
    expect(result.data?.authorName).toBe('Reader');
  });

  it('rejects honeypot submissions', () => {
    expect(validateCommentSubmission({ ...baseInput, website: 'https://spam.example' }).error).toBe('spam_detected');
  });

  it('rejects too-fast submissions', () => {
    const result = validateCommentSubmission({
      ...baseInput,
      startedAt: Date.now() - (COMMENT_MIN_SUBMIT_SECONDS - 1) * 1000,
    });

    expect(result.error).toBe('spam_detected');
  });

  it('requires a challenge token in the payload', () => {
    expect(validateCommentSubmission({ ...baseInput, challengeToken: '' }).error).toBe('invalid_payload');
  });

  it('rejects unsafe story slugs', () => {
    expect(validateCommentSubmission({ ...baseInput, storySlug: '../admin' }).error).toBe('invalid_payload');
  });
});

describe('comment rate limits', () => {
  it('builds a stable per-story client key', () => {
    expect(buildRateLimitKey(baseInput.storyId, '127.0.0.1')).toBe(`comments:${baseInput.storyId}:127.0.0.1`);
  });

  it('blocks attempts over the window limit', () => {
    const now = new Date('2026-06-04T00:00:00.000Z');
    const result = getNextRateLimitState({
      attempt_count: COMMENT_RATE_LIMIT_MAX_ATTEMPTS,
      window_start: now.toISOString(),
    }, now);

    expect(result.allowed).toBe(false);
  });

  it('resets attempts after the rate-limit window', () => {
    const now = new Date('2026-06-04T02:00:00.000Z');
    const oldWindow = new Date(now.getTime() - (COMMENT_RATE_LIMIT_WINDOW_SECONDS + 1) * 1000).toISOString();
    const result = getNextRateLimitState({
      attempt_count: COMMENT_RATE_LIMIT_MAX_ATTEMPTS,
      window_start: oldWindow,
    }, now);

    expect(result.allowed).toBe(true);
    expect(result.state.attempt_count).toBe(1);
  });
});

describe('comment request metadata', () => {
  it('extracts valid forwarded IPs only', () => {
    const headers = new Headers({ 'x-forwarded-for': '127.0.0.1, 10.0.0.1' });

    expect(getClientIp(headers)).toBe('127.0.0.1');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }))).toBeNull();
  });

  it('allows only safe story slugs in redirects', () => {
    expect(getSafeStorySlug('test-story')).toBe('test-story');
    expect(getSafeStorySlug('../admin')).toBeNull();
  });
});
