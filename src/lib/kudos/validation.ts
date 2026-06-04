import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

export const KUDOS_CLIENT_COOKIE = 'story_kudos_client';
export const KUDOS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const kudosSubmissionSchema = z.object({
  storyId: z.string().uuid(),
  storySlug: z.string().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type KudosSubmission = z.output<typeof kudosSubmissionSchema>;

export function validateKudosSubmission(input: unknown): KudosSubmission | null {
  const parsed = kudosSubmissionSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function createKudosClientToken(): string {
  return randomUUID();
}

export function isValidKudosClientToken(value: string | undefined): value is string {
  return !!value && z.string().uuid().safeParse(value).success;
}

export function hashKudosClientToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function isKudosEnabled(value: string | null | undefined): value is 'private' | 'public' {
  return value === 'private' || value === 'public';
}
