// Seeds a deterministic fixture for e2e tests: one author with known
// credentials and one published story (comments on, kudos public).
// Idempotent — safe to run repeatedly. Reads Supabase env from the process
// or .env.local. Used by the e2e CI job and for local e2e runs.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local is optional when the env is already exported (CI).
  }
}

loadDotEnvLocal();

export const AUTHOR_EMAIL = process.env.E2E_AUTHOR_EMAIL ?? 'e2e-author@example.test';
export const AUTHOR_PASSWORD = process.env.E2E_AUTHOR_PASSWORD ?? 'E2ePassword123!';
export const AUTHOR_SLUG = process.env.E2E_AUTHOR_SLUG ?? 'e2e-author';
export const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';
export const DRAFT_SLUG = process.env.E2E_DRAFT_SLUG ?? 'e2e-draft';
export const DRAFT_TOKEN = process.env.E2E_DRAFT_TOKEN ?? '00000000-0000-4000-8000-000000000001';
export const NOINDEX_SLUG = process.env.E2E_NOINDEX_SLUG ?? 'e2e-noindex';

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

async function seed() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: AUTHOR_EMAIL,
    password: AUTHOR_PASSWORD,
    email_confirm: true,
  });

  if (createError && !createError.message.includes('already been registered')) {
    throw new Error(createError.message);
  }

  const userId = created?.user?.id ?? (await resolveUserId(AUTHOR_EMAIL));
  if (!userId) throw new Error('Could not resolve the seeded author id.');

  // Make sure the password is set even if the user already existed.
  await supabase.auth.admin.updateUserById(userId, { password: AUTHOR_PASSWORD, email_confirm: true });

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'author',
    display_name: 'E2E Author',
    locale: 'es',
  });
  if (profileError) throw new Error(profileError.message);

  const { error: authorError } = await supabase.from('authors').upsert({
    id: userId,
    slug: AUTHOR_SLUG,
    display_name: 'E2E Author',
    grammatical_gender: 'neutral',
    bio: 'Seeded author for end-to-end tests.',
  });
  if (authorError) throw new Error(authorError.message);

  const { error: storyError } = await supabase.from('stories').upsert(
    {
      author_id: userId,
      title: 'E2E Welcome Story',
      subtitle: 'A seeded story for end-to-end tests',
      slug: STORY_SLUG,
      body_html: '<p>Welcome to the end-to-end seeded story. It exists so the public flows have something to read, comment on, and applaud.</p>',
      body_json: {},
      status: 'published',
      comments_enabled: true,
      kudos_visibility: 'public',
      indexable: true,
      published_at: '2026-01-01T09:00:00.000Z',
    },
    { onConflict: 'slug' },
  );
  if (storyError) throw new Error(storyError.message);

  // A published story the author opted out of indexing (noindex + AI-blocked).
  const { error: noindexError } = await supabase.from('stories').upsert(
    {
      author_id: userId,
      title: 'E2E Hidden Story',
      subtitle: 'Published but kept out of search engines',
      slug: NOINDEX_SLUG,
      body_html: '<p>This published story should not be indexed or crawled by AI.</p>',
      body_json: {},
      status: 'published',
      comments_enabled: true,
      kudos_visibility: 'private',
      indexable: false,
      published_at: '2026-01-02T09:00:00.000Z',
    },
    { onConflict: 'slug' },
  );
  if (noindexError) throw new Error(noindexError.message);

  // A private draft with a known access token, so e2e can assert draft privacy
  // (noindex, absent from feed/sitemap).
  const { error: draftError } = await supabase.from('stories').upsert(
    {
      author_id: userId,
      title: 'E2E Draft Story',
      subtitle: 'A seeded draft for end-to-end privacy checks',
      slug: DRAFT_SLUG,
      body_html: '<p>This draft should never be indexed or listed publicly.</p>',
      body_json: {},
      status: 'draft',
      comments_enabled: false,
      kudos_visibility: 'disabled',
      published_at: null,
      draft_access_token: DRAFT_TOKEN,
    },
    { onConflict: 'slug' },
  );
  if (draftError) throw new Error(draftError.message);

  console.log(
    `Seeded author ${AUTHOR_EMAIL}, story /stories/${STORY_SLUG}, hidden /stories/${NOINDEX_SLUG}, draft /draft/${DRAFT_TOKEN}`,
  );
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
