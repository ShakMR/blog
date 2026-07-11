import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  createStory,
  createTestAuthor,
  deleteTestAuthor,
  serviceClient,
  signInAs,
  type StoryRow,
  type TestAuthor,
} from './helpers/fixtures';

describe('RLS: story_kudos', () => {
  let author: TestAuthor;
  let admin: TestAuthor;
  let story: StoryRow;

  beforeAll(async () => {
    author = await createTestAuthor();
    admin = await createTestAuthor('admin');
    story = await createStory(author.userId, { kudos_visibility: 'public' });
    // Seed a kudos row via the service role (no public insert policy exists).
    await serviceClient.from('story_kudos').insert({ story_id: story.id, client_hash: 'seed-hash' });
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
    await deleteTestAuthor(admin.userId);
  });

  it('anon cannot read raw kudos rows', async () => {
    const { data } = await anonClient().from('story_kudos').select('id').eq('story_id', story.id);
    expect(data ?? []).toHaveLength(0);
  });

  it('the owning author can read their story kudos', async () => {
    const ownerClient = await signInAs(author);
    const { data } = await ownerClient.from('story_kudos').select('id').eq('story_id', story.id);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('an admin can read any story kudos', async () => {
    const adminClient = await signInAs(admin);
    const { data } = await adminClient.from('story_kudos').select('id').eq('story_id', story.id);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('anon cannot insert kudos directly (no public insert policy)', async () => {
    const { error } = await anonClient()
      .from('story_kudos')
      .insert({ story_id: story.id, client_hash: 'intruder-hash' });
    expect(error).not.toBeNull();
  });
});
