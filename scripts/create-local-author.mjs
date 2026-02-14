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

loadDotEnvLocal();

const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] ?? 'Author Local';
const slug = process.argv[5] ?? 'author-local';

if (!email || !password) {
  console.error('Usage: npm run user:create-local-author -- <email> <password> [displayName] [slug]');
  process.exit(1);
}

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(listError.message);
    process.exit(1);
  }

  userId = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

if (!userId) {
  console.error('Unable to resolve user id.');
  process.exit(1);
}

const { error: profileError } = await supabase.from('profiles').upsert({
  id: userId,
  role: 'author',
  display_name: displayName,
  locale: 'es',
});

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

const { error: authorError } = await supabase.from('authors').upsert({
  id: userId,
  slug,
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

console.log(`Author user ready: ${email} (${userId})`);
