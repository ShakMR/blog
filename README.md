# A poc a poc i amb bona lletra

Infra bootstrap for the new blog platform.

## Stack

- Astro + TypeScript + SASS
- Supabase (Auth + Postgres + Storage)
- Vercel (deployment target)

## Requirements

- Node.js >= 18.20.8 (Node 20 recommended)
- npm >= 9
- Docker Desktop (for local Supabase)
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

## Current status

- Phase: `infra-bootstrap`
- Next feature branch: `uc1-author-login`
