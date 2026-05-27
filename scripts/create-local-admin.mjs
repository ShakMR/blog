import { upsertLocalUser } from './lib/local-users.mjs';

const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] ?? 'Admin Local';
const slug = process.argv[5] ?? 'admin-local';

if (!email || !password) {
  console.error('Usage: npm run user:create-local-admin -- <email> <password> [displayName] [slug]');
  process.exit(1);
}

await upsertLocalUser({
  email,
  password,
  displayName,
  slug,
  role: 'admin',
});
