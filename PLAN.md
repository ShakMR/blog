# A poc a poc i amb bona lletra - Implementation Plan

## 1) Product Scope (v1)

### Use cases and priority order
1. UC1: As Author I want to log in in my personal space.
2. UC5: As Admin I want to create new authors (invite email flow).
3. UC2: As Author I want to write and publish my short stories in a WYSIWYG way.
4. UC2.1: As Author I want to add cover image to my story.
5. UC2.2: As Author I want to disable/enable comments in my story.
6. UC3: As a User I want to see the newest publication by any author.
7. UC4: As a User I want to see all publication by an Author.
8. UC6: As a User I want to add comments to stories (anonymous allowed + anti-spam challenge).

### Confirmed product decisions
- Anonymous comments are allowed.
- Anti-spam is required for comments.
- Author creation uses invite email flow.
- Story lifecycle is draft + publish only.
- Draft stories are accessible by direct link and must not be indexed.
- Authors can edit and delete published stories.
- Stories must display a last edit timestamp.
- No comment moderation in v1.
- UI is multilingual; stories can be in Spanish.
- Story fields: title, subtitle, tags, body, publication date (past dates allowed), cover image, comments on/off.

## 2) Architecture and Stack

- Frontend: Astro + TypeScript + SASS.
- Editor: Tiptap for WYSIWYG.
- Database/Auth/Storage: Supabase (local and cloud).
- Hosting: Vercel.
- Testing: unit + integration + e2e (final stack to be selected during bootstrap).

### Design system direction (initial)
- SASS tokens for color, spacing, typography, radii, elevations, motion.
- Semantic token layer (`--color-bg`, `--color-text`, `--color-accent`, etc).
- i18n-ready content and UI labels.
- Component primitives first: button, input, textarea, select, tag, card, modal, alert.

## 3) Security, Secrets, and Environments

### Secrets management
- Commit only `.env.example`.
- Keep local secrets in `.env.local` (gitignored).
- Configure production secrets in Vercel environment variables.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side.
- Use server-only routes/actions for privileged operations.

### Local/offline testing model
- Use local Supabase stack via CLI + Docker.
- Seed DB and Storage with fixtures for repeatable local tests.
- Run app fully against local services.
- Note: first-time dependency and container download requires internet once.

## 4) Database Model (initial outline)

Tables/entities (to refine in migrations):
- `profiles`: user profile, role (`admin` or `author`), display data, locale.
- `authors`: public author data (slug, bio, avatar, links).
- `stories`: title, subtitle, slug, body JSON (Tiptap), rendered HTML, status (`draft`/`published`), cover image path, comments_enabled, published_at, updated_at.
- `story_tags` + `tags`: normalized tagging.
- `comments`: story_id, author_name (or anon), body, created_at, anti-spam metadata.
- `comment_rate_limits` (or equivalent strategy): anti-spam counters.

RLS policy goals:
- Only admins can invite/create author access.
- Authors can CRUD only their own stories.
- Published stories are publicly readable.
- Draft stories readable only by owner/admin and via signed draft token URL strategy.
- Comments insert allowed under anti-spam checks and per-story setting.

## 5) Branching and Delivery Strategy

Base branch: `primary`.

Planned branches:
1. `infra-bootstrap`
2. `uc1-author-login`
3. `uc5-admin-create-authors`
4. `uc2-author-editor-publish`
5. `uc3-newest-publications`
6. `uc4-publications-by-author`
7. `uc6-comments-anon-antispam`

Rules:
- One branch per use case, one PR per branch.
- Each PR includes tests + QA checklist + migration notes.
- Merge only after VQA approval.
- After merge, return to `primary`, start next branch.

## 6) Phased Plan, Estimates, and Acceptance Criteria

## Phase 0 - Infra Bootstrap (2-3 days)
Goals:
- Initialize Astro + TS + SASS project.
- Integrate Supabase local workflow.
- Set env, migration, seed, lint, format, test scaffolding.
- Define base app architecture and i18n skeleton.

Deliverables:
- Running local app.
- Running local Supabase stack with migrations and seeds.
- `README` for local setup/offline workflow.
- Initial CI checks.

Acceptance:
- Fresh clone can run app locally after setup steps.
- App can connect to local Supabase.
- Basic test command passes.

## Phase 1 - UC1 Author Login (1 day)
Goals:
- Implement login/logout/session management.
- Build protected author space shell.

Acceptance:
- Author can log in and access protected route.
- Non-authenticated users are redirected.
- Role checks in place for private routes.

## Phase 2 - UC5 Admin Creates Authors (1-2 days)
Goals:
- Admin-only UI/API to invite author by email.
- Handle invite acceptance and profile bootstrap.

Acceptance:
- Admin can send invite.
- Invited user can join and become `author`.
- Non-admin cannot access invite flow.

## Phase 3 - UC2/2.1/2.2 Author Editor + Publish (4-6 days)
Goals:
- Tiptap editor with story metadata inputs.
- Draft save, publish/unpublish, edit/delete.
- Cover image upload to Supabase Storage.
- Comments enable/disable per story.
- Last edited stamp tracking.

Acceptance:
- Author can create, edit, and publish stories.
- Publication date accepts past dates.
- Draft has direct-link access and `noindex`.
- Published story shows last edit timestamp.

## Phase 4 - UC3 Newest Publications (1 day)
Goals:
- Public newest stories feed.

Acceptance:
- Users see newest published stories globally.
- Correct ordering and pagination.

## Phase 5 - UC4 Stories by Author (0.5-1 day)
Goals:
- Public author page with all published stories.

Acceptance:
- Users can browse all stories by author slug/profile.

## Phase 6 - UC6 Anonymous Comments + Anti-Spam (2-3 days)
Goals:
- Comment form for anonymous users.
- Anti-spam without internet dependency:
  - honeypot field
  - time-to-submit threshold
  - lightweight challenge question
  - server-side rate limiting

Acceptance:
- User can submit valid comment on enabled stories.
- Disabled comments block submissions.
- Spam heuristics block obvious abuse patterns.

## Phase 7 - Hardening and Release Prep (1-2 days)
Goals:
- Accessibility checks.
- i18n text pass.
- SEO/meta/robots behavior for draft vs published.
- Observability and error handling.

Acceptance:
- No critical accessibility/security regressions.
- Production deployment on Vercel is green.

## 7) Testing Strategy

- Unit tests for domain services and validators.
- Integration tests for DB, RLS-sensitive flows, and API routes.
- E2E tests for critical user journeys:
  - login
  - invite author
  - create/publish story
  - view newest feed
  - post comment with anti-spam checks
- Fixture-based seeds for deterministic local/offline testing.

## 8) SOLID and Code Quality Guardrails

- Keep business rules in domain/services, not UI components.
- Use explicit interfaces for repositories/adapters.
- Single responsibility per module.
- Prefer composition over inheritance.
- Keep functions small and deterministic.
- Explicit code over comments; comments only for non-obvious intent.

## 9) Risks and Mitigations

- Risk: RLS complexity and auth edge cases.
  - Mitigation: write migration tests and integration coverage early.
- Risk: WYSIWYG content sanitation/render mismatch.
  - Mitigation: canonical JSON + controlled HTML rendering pipeline.
- Risk: spam pressure on anonymous comments.
  - Mitigation: layered anti-spam and tighten thresholds progressively.
- Risk: local/offline friction.
  - Mitigation: scripted setup, seed data, and documented offline workflow.

## 10) Execution Protocol with VQA

For each use case branch:
1. Implement feature + tests + migrations.
2. Provide QA checklist for manual validation.
3. Hand over for VQA.
4. After VQA approval, commit changes in the branch.
5. Push branch and open a PR for review/approval.
6. Merge after PR approval.
7. Checkout `primary` and start next branch.

This plan is the baseline and can be refined after each UC based on VQA feedback.
