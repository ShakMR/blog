create unique index if not exists stories_draft_access_token_key
  on public.stories (draft_access_token);

create index if not exists stories_status_published_at_idx
  on public.stories (status, published_at desc);
