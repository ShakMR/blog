-- Fix: app.is_admin() declared a PL/pgSQL variable named `current_role`, which
-- is a reserved SQL keyword that evaluates to the current session role name
-- (e.g. 'authenticated'). As a result `return current_role = 'admin'` was always
-- false, so admins never actually gained admin access through RLS policies
-- (admin story/kudos reads, profile inserts, author management). This went
-- unnoticed because admin operations run via the service-role API, which
-- bypasses RLS. Rename the variable so the profile role is compared correctly.
create or replace function app.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  profile_role public.user_role;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role into profile_role
  from public.profiles
  where id = auth.uid();

  return profile_role = 'admin';
end;
$$;
