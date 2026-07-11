import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '../../src/pages/api/kudos/create';
import { KUDOS_CLIENT_COOKIE } from '../../src/lib/kudos/validation';
import { makeApiContext } from './helpers/apiContext';
import {
  createStory,
  createTestAuthor,
  deleteTestAuthor,
  type StoryRow,
  type TestAuthor,
} from './helpers/fixtures';

const JSON_HEADERS = { accept: 'application/json' };

async function postJson(
  form: Record<string, string>,
  opts: { headers?: Record<string, string>; cookies?: Record<string, string> } = {},
) {
  const { context, setCookies } = makeApiContext({
    form,
    headers: { ...JSON_HEADERS, ...(opts.headers ?? {}) },
    cookies: opts.cookies,
  });
  const response = await POST(context as never);
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : {};
  return { response, body, setCookies };
}

describe('API: POST /api/kudos/create', () => {
  let author: TestAuthor;
  let story: StoryRow;
  let disabledStory: StoryRow;

  beforeAll(async () => {
    author = await createTestAuthor();
    story = await createStory(author.userId, { status: 'published', kudos_visibility: 'public' });
    disabledStory = await createStory(author.userId, { status: 'published', kudos_visibility: 'disabled' });
  });

  afterAll(async () => {
    await deleteTestAuthor(author.userId);
  });

  it('accepts a first kudos, sets a client cookie, and returns a count', async () => {
    const { response, body, setCookies } = await postJson({ storyId: story.id, storySlug: story.slug });

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(setCookies.some((cookie) => cookie.name === KUDOS_CLIENT_COOKIE)).toBe(true);
  });

  it('does not double-count a repeat kudos from the same client', async () => {
    const first = await postJson({ storyId: story.id, storySlug: story.slug });
    const token = first.setCookies.find((cookie) => cookie.name === KUDOS_CLIENT_COOKIE)?.value as string;

    const second = await postJson(
      { storyId: story.id, storySlug: story.slug },
      { cookies: { [KUDOS_CLIENT_COOKIE]: token } },
    );

    expect(second.body.ok).toBe(true);
    // Same client hash → unique violation is swallowed; count is unchanged.
    expect(second.body.count).toBe(first.body.count);
  });

  it('rejects kudos on a kudos-disabled story', async () => {
    const { response, body } = await postJson({ storyId: disabledStory.id, storySlug: disabledStory.slug });
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('closed');
  });

  it('rejects a cross-origin submission', async () => {
    const { response, body } = await postJson(
      { storyId: story.id, storySlug: story.slug },
      { headers: { origin: 'http://evil.example' } },
    );
    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid_origin');
  });
});
