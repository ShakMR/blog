import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  createStory,
  createTestAuthor,
  deleteTestAuthor,
  signInAs,
  type StoryRow,
  type TestAuthor,
} from './helpers/fixtures';

describe('RLS: stories', () => {
  let author: TestAuthor;
  let otherAuthor: TestAuthor;
  let published: StoryRow;
  let draft: StoryRow;

  beforeAll(async () => {
    author = await createTestAuthor();
    otherAuthor = await createTestAuthor();
    published = await createStory(author.userId, { status: 'published' });
    draft = await createStory(author.userId, { status: 'draft', published_at: null });
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
    await deleteTestAuthor(otherAuthor.userId);
  });

  it('anon can read a published story', async () => {
    const { data } = await anonClient().from('stories').select('id').eq('id', published.id).maybeSingle();
    expect(data?.id).toBe(published.id);
  });

  it('anon cannot read a draft story', async () => {
    const { data } = await anonClient().from('stories').select('id').eq('id', draft.id).maybeSingle();
    expect(data).toBeNull();
  });

  it('the owning author can read their own draft', async () => {
    const ownerClient = await signInAs(author);
    const { data } = await ownerClient.from('stories').select('id').eq('id', draft.id).maybeSingle();
    expect(data?.id).toBe(draft.id);
  });

  it("an author cannot update another author's story", async () => {
    const intruder = await signInAs(otherAuthor);
    const { data, error } = await intruder
      .from('stories')
      .update({ title: 'hijacked' })
      .eq('id', published.id)
      .select();

    // RLS filters the row out of the update set: no error, nothing updated.
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await anonClient()
      .from('stories')
      .select('title')
      .eq('id', published.id)
      .single();
    expect(check?.title).not.toBe('hijacked');
  });

  it('the owning author can update their own story', async () => {
    const ownerClient = await signInAs(author);
    const { data, error } = await ownerClient
      .from('stories')
      .update({ subtitle: 'updated by owner' })
      .eq('id', published.id)
      .select();

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });
});
