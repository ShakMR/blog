create type public.grammatical_gender as enum ('masculine', 'feminine', 'neutral');

alter table public.authors
  add column if not exists display_name text not null default '',
  add column if not exists grammatical_gender public.grammatical_gender not null default 'neutral';

update public.authors a
set display_name = p.display_name
from public.profiles p
where a.id = p.id
  and coalesce(a.display_name, '') = '';
