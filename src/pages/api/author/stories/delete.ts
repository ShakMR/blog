import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuthorContext } from '../../../../lib/auth/guards';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { withApiErrorHandling } from '../../../../lib/http/responses';

const deleteSchema = z.object({
  storyId: z.string().uuid(),
});

export const POST: APIRoute = withApiErrorHandling(async (context) => {
  const guard = await requireAuthorContext(context);
  if (!guard) {
    return context.redirect('/auth/login?next=/author/stories', 302);
  }

  const { accessToken, authorContext } = guard;
  const formData = await context.request.formData();

  const parsed = deleteSchema.safeParse({
    storyId: formData.get('storyId')?.toString(),
  });

  if (!parsed.success) {
    return context.redirect('/author/stories?error=invalid_story_id', 302);
  }

  const authorClient = createServerSupabaseClient({ accessToken });

  const { data: existing } = await authorClient
    .from('stories')
    .select('id, author_id')
    .eq('id', parsed.data.storyId)
    .maybeSingle();

  if (!existing || existing.author_id !== authorContext.profile.id) {
    return context.redirect('/author/stories?error=story_not_found', 302);
  }

  const { error } = await authorClient.from('stories').delete().eq('id', parsed.data.storyId);

  if (error) {
    return context.redirect('/author/stories?error=story_delete_failed', 302);
  }

  return context.redirect('/author/stories?status=deleted', 302);
}, (context) => context.redirect('/author/stories?error=story_delete_failed', 302));
