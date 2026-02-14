-- Seed data for local development.
-- Auth users should be created through Supabase Auth flows during UC1/UC5.

insert into public.comments (story_id, author_name, body)
select gen_random_uuid(), 'system', 'seed placeholder'
where false;
