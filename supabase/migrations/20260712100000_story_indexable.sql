-- Per-story search-engine indexing opt-out. When false, the published story
-- stays publicly reachable but is served noindex, kept out of the sitemap, and
-- disallowed for AI crawlers via robots.txt.
alter table public.stories
  add column if not exists indexable boolean not null default true;
