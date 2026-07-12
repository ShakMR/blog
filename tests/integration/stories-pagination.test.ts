import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPublishedStoriesPage } from '../../src/lib/stories/pagination';
import { anonClient, createStory, createTestAuthor, deleteTestAuthor, type TestAuthor } from './helpers/fixtures';

describe('getPublishedStoriesPage', () => {
  let author: TestAuthor;
  const seededIds: string[] = [];

  beforeAll(async () => {
    author = await createTestAuthor();
    for (let i = 0; i < 5; i += 1) {
      const story = await createStory(author.userId, {
        status: 'published',
        published_at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      });
      seededIds.push(story.id);
    }
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
  });

  it('walks every published story exactly once across pages, with correct flags', async () => {
    const pageSize = 2;
    const seen = new Set<string>();
    let page = 1;
    let hasNext = true;
    let guard = 0;

    while (hasNext && guard < 200) {
      const result = await getPublishedStoriesPage(anonClient(), page, pageSize);
      expect(result.stories.length).toBeLessThanOrEqual(pageSize);
      expect(result.hasPrev).toBe(page > 1);

      for (const story of result.stories) {
        expect(seen.has(story.id)).toBe(false); // no overlap between pages
        seen.add(story.id);
      }

      hasNext = result.hasNext;
      page += 1;
      guard += 1;
    }

    // Every seeded story was returned somewhere in the walk.
    for (const id of seededIds) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it('reports hasPrev=false on page 1 and never returns more than a full page', async () => {
    const first = await getPublishedStoriesPage(anonClient(), 1, 2);
    expect(first.hasPrev).toBe(false);
    expect(first.stories.length).toBeLessThanOrEqual(2);
    // With 5+ published stories in the DB, page 1 (size 2) must have a next page.
    expect(first.hasNext).toBe(true);
  });
});
