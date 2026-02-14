create extension if not exists "pgcrypto";

create schema if not exists app;

create type public.user_role as enum ('admin', 'author');
create type public.story_status as enum ('draft', 'published');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'author',
  display_name text not null,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authors (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  bio text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors (id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  slug text not null unique,
  tags text[] not null default '{}',
  body_json jsonb not null default '{}'::jsonb,
  body_html text not null default '',
  status public.story_status not null default 'draft',
  comments_enabled boolean not null default true,
  cover_image_path text,
  published_at timestamptz,
  draft_access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_story_has_publication_date
    check (status = 'draft' or published_at is not null)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  author_name text not null,
  body text not null,
  author_email_hash text,
  user_agent text,
  source_ip inet,
  created_at timestamptz not null default now()
);

create table if not exists public.comment_rate_limits (
  key text primary key,
  attempt_count integer not null default 1,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function app.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_role public.user_role;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role into current_role
  from public.profiles
  where id = auth.uid();

  return current_role = 'admin';
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_authors_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

create trigger set_stories_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.authors enable row level security;
alter table public.stories enable row level security;
alter table public.comments enable row level security;
alter table public.comment_rate_limits enable row level security;

create policy "profile owner can read own profile"
on public.profiles
for select
using (app.current_user_id() = id or app.is_admin());

create policy "profile owner can update own profile"
on public.profiles
for update
using (app.current_user_id() = id or app.is_admin())
with check (app.current_user_id() = id or app.is_admin());

create policy "admin can insert profiles"
on public.profiles
for insert
with check (app.is_admin());

create policy "public can read authors"
on public.authors
for select
using (true);

create policy "admin can manage authors"
on public.authors
for all
using (app.is_admin())
with check (app.is_admin());

create policy "public can read published stories"
on public.stories
for select
using (status = 'published' or app.current_user_id() = author_id or app.is_admin());

create policy "authors can insert own stories"
on public.stories
for insert
with check (app.current_user_id() = author_id or app.is_admin());

create policy "authors can update own stories"
on public.stories
for update
using (app.current_user_id() = author_id or app.is_admin())
with check (app.current_user_id() = author_id or app.is_admin());

create policy "authors can delete own stories"
on public.stories
for delete
using (app.current_user_id() = author_id or app.is_admin());

create policy "public can read comments"
on public.comments
for select
using (
  exists (
    select 1
    from public.stories s
    where s.id = story_id
      and s.status = 'published'
      and s.comments_enabled = true
  )
);

create policy "public can insert comments for enabled stories"
on public.comments
for insert
with check (
  exists (
    select 1
    from public.stories s
    where s.id = story_id
      and s.status = 'published'
      and s.comments_enabled = true
  )
);

create policy "admins can manage comment rate limits"
on public.comment_rate_limits
for all
using (app.is_admin())
with check (app.is_admin());

insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict (id) do nothing;
