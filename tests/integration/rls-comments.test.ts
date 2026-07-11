import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  createStory,
  createTestAuthor,
  deleteTestAuthor,
  serviceClient,
  type StoryRow,
  type TestAuthor,
} from './helpers/fixtures';

describe('RLS: comments', () => {
  let author: TestAuthor;
  let enabledStory: StoryRow;
  let disabledStory: StoryRow;
  let draftStory: StoryRow;

  beforeAll(async () => {
    author = await createTestAuthor();
    enabledStory = await createStory(author.userId, { status: 'published', comments_enabled: true });
    disabledStory = await createStory(author.userId, { status: 'published', comments_enabled: false });
    draftStory = await createStory(author.userId, { status: 'draft', published_at: null });
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
  });

  it('anon cannot insert comments directly — writes go through the service-role API', async () => {
    // Migration 20260604003000 dropped the public insert policy on purpose: all
    // comment writes must go through the rate-limited, anti-spam API route.
    const { error } = await anonClient()
      .from('comments')
      .insert({ story_id: enabledStory.id, author_name: 'Anon', body: 'blocked' });
    expect(error).not.toBeNull();
  });

  it('anon can read comments on a published, comments-enabled story', async () => {
    await serviceClient
      .from('comments')
      .insert({ story_id: enabledStory.id, author_name: 'seed', body: 'visible' });

    const { data } = await anonClient().from('comments').select('id').eq('story_id', enabledStory.id);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('anon cannot read comments on a comments-disabled story', async () => {
    await serviceClient
      .from('comments')
      .insert({ story_id: disabledStory.id, author_name: 'seed', body: 'hidden' });

    const { data } = await anonClient().from('comments').select('id').eq('story_id', disabledStory.id);
    expect(data ?? []).toHaveLength(0);
  });

  it('anon cannot read comments on a draft story', async () => {
    await serviceClient
      .from('comments')
      .insert({ story_id: draftStory.id, author_name: 'seed', body: 'hidden' });

    const { data } = await anonClient().from('comments').select('id').eq('story_id', draftStory.id);
    expect(data ?? []).toHaveLength(0);
  });
});
