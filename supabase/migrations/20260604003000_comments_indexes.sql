create index if not exists comments_story_created_at_idx
  on public.comments (story_id, created_at);

create index if not exists comment_rate_limits_updated_at_idx
  on public.comment_rate_limits (updated_at);

drop policy if exists "public can insert comments for enabled stories"
on public.comments;
