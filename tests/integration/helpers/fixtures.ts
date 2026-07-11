import { createServerSupabaseClient, createServiceRoleClient } from '../../../src/lib/supabase/server';

// Service-role client bypasses RLS; used only to seed/inspect/clean up fixtures.
export const serviceClient = createServiceRoleClient();

let counter = 0;
function uniqueSuffix(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export interface TestAuthor {
  userId: string;
  email: string;
  password: string;
  slug: string;
  role: 'author' | 'admin';
}

export interface StoryOverrides {
  title?: string;
  subtitle?: string;
  status?: 'draft' | 'published';
  comments_enabled?: boolean;
  kudos_visibility?: 'disabled' | 'private' | 'public';
  published_at?: string | null;
  body_html?: string;
}

/** Create an auth user plus its profile + author rows via the service role. */
export async function createTestAuthor(role: 'author' | 'admin' = 'author'): Promise<TestAuthor> {
  const email = `${uniqueSuffix('user')}@example.test`;
  const password = 'Password123!';
  const slug = uniqueSuffix('slug');

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? 'no user returned'}`);
  }
  const userId = data.user.id;

  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: userId,
    role,
    display_name: `Test ${role}`,
    locale: 'es',
  });
  if (profileError) {
    throw new Error(`profile upsert failed: ${profileError.message}`);
  }

  const { error: authorError } = await serviceClient.from('authors').upsert({
    id: userId,
    slug,
    display_name: `Test ${role}`,
    grammatical_gender: 'neutral',
    bio: '',
  });
  if (authorError) {
    throw new Error(`author upsert failed: ${authorError.message}`);
  }

  return { userId, email, password, slug, role };
}

/** Sign in as the given author and return an RLS-scoped client (anon key + JWT). */
export async function signInAs(author: TestAuthor) {
  const client = createServerSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: author.email,
    password: author.password,
  });
  if (error || !data.session) {
    throw new Error(`signIn failed: ${error?.message ?? 'no session'}`);
  }
  return createServerSupabaseClient({ accessToken: data.session.access_token });
}

/** A fresh anonymous (RLS-scoped) client. */
export function anonClient() {
  return createServerSupabaseClient();
}

export interface StoryRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  status: string;
  comments_enabled: boolean;
  kudos_visibility: string;
}

/** Insert a story owned by authorId. Defaults to a published, comment+kudos-enabled story. */
export async function createStory(authorId: string, overrides: StoryOverrides = {}): Promise<StoryRow> {
  const slug = uniqueSuffix('story');
  const row = {
    author_id: authorId,
    title: overrides.title ?? 'Test Story',
    subtitle: overrides.subtitle ?? '',
    slug,
    body_html: overrides.body_html ?? '<p>hello world</p>',
    status: overrides.status ?? 'published',
    comments_enabled: overrides.comments_enabled ?? true,
    kudos_visibility: overrides.kudos_visibility ?? 'public',
    published_at:
      overrides.published_at !== undefined
        ? overrides.published_at
        : (overrides.status ?? 'published') === 'published'
          ? new Date().toISOString()
          : null,
  };

  const { data, error } = await serviceClient.from('stories').insert(row).select().single();
  if (error || !data) {
    throw new Error(`story insert failed: ${error?.message ?? 'no row'}`);
  }
  return data as StoryRow;
}

/** Delete an auth user; cascades to profile -> author -> stories -> comments/kudos. */
export async function deleteTestAuthor(userId: string): Promise<void> {
  await serviceClient.auth.admin.deleteUser(userId);
}

/** Remove any rate-limit rows created for a story so tests stay independent. */
export async function clearRateLimits(storyId: string): Promise<void> {
  await serviceClient.from('comment_rate_limits').delete().like('key', `comments:${storyId}:%`);
}
