-- Re-assert the standard Supabase privilege grants for the API roles.
--
-- Depending on the CLI version, a fresh `supabase start` can apply user
-- migrations under a role whose newly created tables do NOT inherit the default
-- privilege grants. In that state even the service role (which should bypass
-- RLS and have full access) gets "permission denied for table ..." on writes,
-- which breaks the integration/e2e stacks in CI. On a properly initialized
-- project these grants already exist, so this migration is a no-op there.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Same for objects created by future migrations in this schema.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
