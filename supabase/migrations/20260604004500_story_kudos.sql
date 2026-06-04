alter table public.stories
add column if not exists kudos_visibility text not null default 'private';

alter table public.stories
add constraint stories_kudos_visibility_check
check (kudos_visibility in ('disabled', 'private', 'public'));

create table if not exists public.story_kudos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  client_hash text not null,
  user_agent text,
  source_ip inet,
  created_at timestamptz not null default now(),
  unique (story_id, client_hash)
);

create index if not exists story_kudos_story_created_at_idx
  on public.story_kudos (story_id, created_at desc);

alter table public.story_kudos enable row level security;

create policy "authors can read own story kudos"
on public.story_kudos
for select
using (
  exists (
    select 1
    from public.stories s
    where s.id = story_id
      and (s.author_id = app.current_user_id() or app.is_admin())
  )
);
