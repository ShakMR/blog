import { describe, expect, it } from 'vitest';
import {
  hashKudosClientToken,
  isKudosEnabled,
  isValidKudosClientToken,
  validateKudosSubmission,
} from '../../src/lib/kudos/validation';

describe('kudos validation', () => {
  it('accepts a valid story kudos payload', () => {
    expect(validateKudosSubmission({
      storyId: '11111111-1111-4111-8111-111111111111',
      storySlug: 'published-story',
    })).toEqual({
      storyId: '11111111-1111-4111-8111-111111111111',
      storySlug: 'published-story',
    });
  });

  it('rejects unsafe story slugs', () => {
    expect(validateKudosSubmission({
      storyId: '11111111-1111-4111-8111-111111111111',
      storySlug: '../admin',
    })).toBeNull();
  });

  it('validates anonymous client tokens', () => {
    expect(isValidKudosClientToken('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isValidKudosClientToken('not-a-token')).toBe(false);
  });

  it('hashes client tokens before persistence', () => {
    const hash = hashKudosClientToken('11111111-1111-4111-8111-111111111111');

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('11111111');
  });

  it('treats only private and public visibility as enabled', () => {
    expect(isKudosEnabled('private')).toBe(true);
    expect(isKudosEnabled('public')).toBe(true);
    expect(isKudosEnabled('disabled')).toBe(false);
  });
});
