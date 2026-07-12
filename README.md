# A poc a poc i amb bona lletra

[![CI](https://github.com/ShakMR/blog/actions/workflows/ci.yml/badge.svg?branch=primary)](https://github.com/ShakMR/blog/actions/workflows/ci.yml)

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
- `npm run test:integration`: run integration tests (needs a local Supabase stack)
- `npm run test:e2e`: run Playwright e2e tests (needs Supabase + seeded fixture)
- `npm run seed:test`: seed the deterministic e2e fixture (author + published story)
- `npm run build`: check + production build
- `npm run supabase:start`: boot local Supabase
- `npm run supabase:stop`: stop local Supabase
- `npm run supabase:reset`: reset DB from migrations and seed
- `npm run supabase:status`: print local credentials and service URLs
- `npm run user:create-local-admin -- <email> <password> [displayName] [slug]`: create/reset local admin user with author capabilities
- `npm run user:create-local-author -- <email> <password> [displayName] [slug]`: create/reset local author user

## Testing

Three layers:

- **Unit** (`npm run test`, Vitest) — pure domain/validation logic; no services.
- **Integration** (`npm run test:integration`, Vitest + real Supabase) — RLS access boundaries for stories/comments/kudos and the comments/kudos API handlers (honeypot, timing, challenge, rate limiting, cookie dedup). Needs the local Supabase stack running.
- **E2E** (`npm run test:e2e`, Playwright) — public feed/card/comment/kudos/SEO flows, the authed login → publish journey, and axe accessibility scans over the key pages. Run `npm run seed:test` first, and make sure the app builds against the local Supabase stack.

Local e2e quickstart:

```bash
npm run supabase:start
npm run seed:test
npm run test:e2e
```

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `primary`, as three parallel jobs (Node 20, npm caching):

- **Check & unit tests** — `npm run check` + `npm run test`. Fast, no services.
- **Integration (Supabase)** — boots a Supabase stack via `supabase/setup-cli`, then `npm run test:integration`.
- **E2E (Playwright)** — boots Supabase, seeds the fixture, installs Chromium, then `npm run test:e2e`.

## Current status

- Latest merged: CI foundation (PR #10), integration + e2e suites (PR #11), and SEO + draft privacy + indexing opt-out (PR #12).
- Features: author login, admin-invited authors, WYSIWYG editor with draft/publish + cover images, public newest-publications feed (paginated `/stories`), per-author pages, reader comments + kudos, and SEO (canonical/OpenGraph, `/sitemap.xml`, `/robots.txt`) with draft privacy and a per-story search-indexing opt-out (noindex + AI-crawler block).
- Next: remaining Phase 7 hardening (i18n pass, error handling). See `PLAN.md`.

## UC5 local admin flow

1. Ensure Supabase local stack is running.
2. Create a local admin user:

```bash
npm run user:create-local-admin -- admin@example.com Password123! "Admin Local" admin-local
```

Note for `zsh`: if your password has `!`, wrap it in single quotes.

3. Start app:

```bash
npm run dev
```

4. Validate flow:
- Open `/auth/login`.
- Login with the admin credentials.
- Open `/author` and confirm the dashboard shows user information, latest stories, and the admin-only create-author action.
- Open `/author/admin/users/new` from the dashboard create-author action.
- Create a new author with email, display name, optional slug, locale, and a temporary password.
- Confirm the page shows a ready-to-send email draft with recipient, subject, and body.
- Log out and log in with the new author account.
- Confirm the new user can access `/author` and `/author/stories/new`.
- Copy the draft into Gmail manually and send it to the new author.

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
