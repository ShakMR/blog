import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '../../src/pages/api/comments/create';
import { createChallenge } from '../../src/lib/comments/challenge';
import { makeApiContext, readRedirect } from './helpers/apiContext';
import {
  clearRateLimits,
  createStory,
  createTestAuthor,
  deleteTestAuthor,
  serviceClient,
  type StoryRow,
  type TestAuthor,
} from './helpers/fixtures';

function validForm(story: StoryRow, overrides: Record<string, string> = {}) {
  const challenge = createChallenge();
  return {
    storyId: story.id,
    storySlug: story.slug,
    authorName: 'Commenter',
    body: 'A thoughtful, on-topic comment.',
    website: '',
    startedAt: String(Date.now() - 10_000), // 10s ago → passes the min-submit window
    challengeAnswer: String(challenge.a + challenge.b),
    challengeToken: challenge.token,
    ...overrides,
  };
}

async function post(form: Record<string, string>) {
  const { context } = makeApiContext({ form });
  const response = await POST(context as never);
  return readRedirect(response);
}

async function commentCount(storyId: string): Promise<number> {
  const { count } = await serviceClient
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('story_id', storyId);
  return count ?? 0;
}

describe('API: POST /api/comments/create', () => {
  let author: TestAuthor;
  let story: StoryRow;
  let disabledStory: StoryRow;

  beforeAll(async () => {
    author = await createTestAuthor();
    story = await createStory(author.userId, { status: 'published', comments_enabled: true });
    disabledStory = await createStory(author.userId, { status: 'published', comments_enabled: false });
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
  });

  it('accepts a valid comment and persists it', async () => {
    const before = await commentCount(story.id);
    const result = await post(validForm(story));

    expect(result.location).toContain(`/stories/${story.slug}`);
    expect(result.params.get('comment_status')).toBe('posted');
    expect(await commentCount(story.id)).toBe(before + 1);
    await clearRateLimits(story.id);
  });

  it('rejects a filled honeypot as spam', async () => {
    const result = await post(validForm(story, { website: 'http://spam.example' }));
    expect(result.params.get('comment_error')).toBe('spam_detected');
    await clearRateLimits(story.id);
  });

  it('rejects a too-fast submission as spam', async () => {
    const result = await post(validForm(story, { startedAt: String(Date.now()) }));
    expect(result.params.get('comment_error')).toBe('spam_detected');
    await clearRateLimits(story.id);
  });

  it('rejects a wrong anti-spam challenge answer', async () => {
    // 999 can never equal a+b (each addend is 1..9), so this is always wrong
    // regardless of the randomly generated challenge in validForm.
    const result = await post(validForm(story, { challengeAnswer: '999' }));
    expect(result.params.get('comment_error')).toBe('challenge_failed');
    await clearRateLimits(story.id);
  });

  it('blocks comments on a comments-disabled story', async () => {
    const result = await post(validForm(disabledStory));
    expect(result.params.get('comment_error')).toBe('comments_closed');
  });

  it('rate-limits after the allowed number of attempts', async () => {
    const rlStory = await createStory(author.userId, { status: 'published', comments_enabled: true });
    await clearRateLimits(rlStory.id);

    const outcomes: (string | null)[] = [];
    for (let i = 0; i < 6; i += 1) {
      const result = await post(validForm(rlStory));
      outcomes.push(result.params.get('comment_status') ?? result.params.get('comment_error'));
    }

    // First 5 succeed, the 6th is rate limited.
    expect(outcomes.slice(0, 5)).toEqual(['posted', 'posted', 'posted', 'posted', 'posted']);
    expect(outcomes[5]).toBe('rate_limited');
  });
});
