import { isIP } from 'node:net';
import { z } from 'zod';
import type { CommentRateLimitState, CommentSubmissionError } from './types';

export const COMMENT_MIN_SUBMIT_SECONDS = 4;
export const COMMENT_MAX_SUBMIT_SECONDS = 60 * 60 * 2;
export const COMMENT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
export const COMMENT_RATE_LIMIT_MAX_ATTEMPTS = 5;

const commentSubmissionSchema = z.object({
  storyId: z.string().uuid(),
  storySlug: z.string().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  authorName: z.string().trim().min(1).max(80),
  body: z.string().trim().min(2).max(1200),
  website: z.string().max(200).optional(),
  startedAt: z.coerce.number().int().positive(),
  challengeAnswer: z.string().trim().min(1).max(20),
  challengeToken: z.string().min(1).max(200),
});

export type CommentSubmissionInput = z.input<typeof commentSubmissionSchema>;
export type CommentSubmission = z.output<typeof commentSubmissionSchema>;

interface ValidationResult {
  success: boolean;
  data?: CommentSubmission;
  error?: CommentSubmissionError;
}

export function validateCommentSubmission(input: CommentSubmissionInput, now = Date.now()): ValidationResult {
  const parsed = commentSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'invalid_payload' };
  }

  const payload = parsed.data;

  if (payload.website?.trim()) {
    return { success: false, error: 'spam_detected' };
  }

  const elapsedSeconds = (now - payload.startedAt) / 1000;
  if (elapsedSeconds < COMMENT_MIN_SUBMIT_SECONDS || elapsedSeconds > COMMENT_MAX_SUBMIT_SECONDS) {
    return { success: false, error: 'spam_detected' };
  }

  // The arithmetic challenge itself is verified in the route handler via
  // verifyChallenge (it needs the signing secret); here we only ensure the
  // fields are present and the honeypot/timing gates pass.
  return { success: true, data: payload };
}

export function getClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
  ];

  return candidates.find((candidate) => candidate && isIP(candidate) !== 0) ?? null;
}

export function getSafeStorySlug(value: string | null | undefined): string | null {
  if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return null;
  }

  return value;
}

export function buildRateLimitKey(storyId: string, clientIp: string | null): string {
  return `comments:${storyId}:${clientIp || 'unknown'}`;
}

export function getNextRateLimitState(
  existing: CommentRateLimitState | null,
  now = new Date(),
): { allowed: boolean; state: CommentRateLimitState } {
  if (!existing) {
    return {
      allowed: true,
      state: { attempt_count: 1, window_start: now.toISOString() },
    };
  }

  const windowStart = new Date(existing.window_start);
  const elapsedSeconds = (now.getTime() - windowStart.getTime()) / 1000;

  if (Number.isNaN(windowStart.getTime()) || elapsedSeconds >= COMMENT_RATE_LIMIT_WINDOW_SECONDS) {
    return {
      allowed: true,
      state: { attempt_count: 1, window_start: now.toISOString() },
    };
  }

  const nextCount = existing.attempt_count + 1;
  return {
    allowed: nextCount <= COMMENT_RATE_LIMIT_MAX_ATTEMPTS,
    state: { attempt_count: nextCount, window_start: existing.window_start },
  };
}
