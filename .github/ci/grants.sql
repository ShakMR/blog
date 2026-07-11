-- CI-only: re-assert the API-role privileges on the public schema.
--
-- A real Supabase project (and a properly initialized local stack) grants these
-- to anon/authenticated/service_role automatically via default privileges, so
-- new tables from migrations inherit them and nothing here is needed. But a
-- fresh `supabase start` in CI can apply migrations without that inheritance,
-- leaving the tables ungranted so the service role hits "permission denied for
-- table ..." on writes. This script reproduces the standard grant posture in
-- the ephemeral CI database; RLS remains the row-level gate. It is applied only
-- from the CI workflow and is intentionally NOT a migration (prod doesn't need
-- it).

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
