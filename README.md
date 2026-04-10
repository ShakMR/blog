# A poc a poc i amb bona lletra

Infra bootstrap for the new blog platform.

## Stack

- Astro + TypeScript + SASS
- Supabase (Auth + Postgres + Storage)
- Vercel (deployment target)

## Requirements

- Node.js >= 18.20.8 (Node 20 recommended)
- npm >= 9
- Docker-compatible runtime (Colima, OrbStack, or Docker Desktop) for local Supabase
- Supabase CLI

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template:

```bash
cp .env.example .env.local
```

3. Start Supabase local services:

```bash
npm run supabase:start
```

4. Get local keys and update `.env.local`:

```bash
npm run supabase:status
```

5. Reset database with migrations + seed when needed:

```bash
npm run supabase:reset
```

6. Run app:

```bash
npm run dev
```

## Offline workflow

After first dependency and Docker image download, local testing works offline:

- app against local Supabase stack
- local DB migrations and seeds
- local storage bucket (`story-covers`)

## Available scripts

- `npm run dev`: start Astro dev server
- `npm run check`: type/content checks
- `npm run test`: run unit tests
- `npm run build`: check + production build
- `npm run supabase:start`: boot local Supabase
- `npm run supabase:stop`: stop local Supabase
- `npm run supabase:reset`: reset DB from migrations and seed
- `npm run supabase:status`: print local credentials and service URLs
- `npm run user:create-local-author -- <email> <password> [displayName] [slug]`: create/reset local author user

## Current status

- Phase: `uc2-uc3-editor-and-feed`
- Current features: author editor/publish flow + public newest publications feed

## UC2 + UC3 local VQA

1. Ensure Supabase local stack is running.
2. Create a local author user:

```bash
npm run user:create-local-author -- author@example.com Password123! "Autor Local" autor-local
```

Note for `zsh`: if your password has `!`, wrap it in single quotes.

3. Start app:

```bash
npm run dev
```

4. Validate flow:
- Open `/auth/login`.
- Login with the created credentials.
- Open `/author/stories/new` and create a draft using the WYSIWYG editor.
- Confirm it appears in `/author/stories`, including draft link and edit link.
- Edit and publish the story (including past publication date, cover image, and comments toggle).
- Open `/stories` and confirm newest publications appear sorted by publication date desc.
- Open `/stories/<slug>` and verify rendered content + timestamps.
- Open draft link `/draft/<token>` and confirm private draft is served with `noindex`.
