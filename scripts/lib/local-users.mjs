import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, delimiterIndex).trim();
      const value = trimmed.slice(delimiterIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional if env vars are already exported.
  }
}

function createAdminClient() {
  loadDotEnvLocal();

  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function resolveUserIdByEmail(supabase, email) {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(listError.message);
    process.exit(1);
  }

  return existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

export async function upsertLocalUser({
  email,
  password,
  displayName,
  slug,
  role,
  locale = 'es',
}) {
  const supabase = createAdminClient();

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError && !createUserError.message.includes('already been registered')) {
    console.error(createUserError.message);
    process.exit(1);
  }

  let userId = createdUser?.user?.id;

  if (!userId) {
    userId = await resolveUserIdByEmail(supabase, email);
  }

  if (!userId) {
    console.error('Unable to resolve user id.');
    process.exit(1);
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    display_name: displayName,
    locale,
  });

  if (profileError) {
    console.error(profileError.message);
    process.exit(1);
  }

  const { error: authorError } = await supabase.from('authors').upsert({
    id: userId,
    slug,
    display_name: displayName,
    grammatical_gender: 'neutral',
    bio: '',
  });

  if (authorError) {
    console.error(authorError.message);
    process.exit(1);
  }

  const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });

  if (updatePasswordError) {
    console.error(updatePasswordError.message);
    process.exit(1);
  }

  console.log(`${role} user ready: ${email} (${userId})`);
}
