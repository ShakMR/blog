import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuthorContext } from '../../../../lib/auth/guards';
import { createServerSupabaseClient, createServiceRoleClient } from '../../../../lib/supabase/server';
import { parseTags, sanitizeFilename, slugify } from '../../../../lib/stories/utils';
import { withApiErrorHandling } from '../../../../lib/http/responses';

const saveStorySchema = z.object({
  storyId: z.string().uuid().optional(),
  title: z.string().min(1).max(180),
  subtitle: z.string().max(220),
  slug: z.string().optional(),
  tags: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyJson: z.string().optional(),
  status: z.enum(['draft', 'published']),
  commentsEnabled: z.enum(['true', 'false']).optional(),
  indexable: z.enum(['true', 'false']).optional(),
  kudosVisibility: z.enum(['disabled', 'private', 'public']),
  publishedAt: z.string().optional(),
  existingCoverPath: z.string().optional(),
});

function uniqueSlugCandidate(inputSlug: string | undefined, title: string, storyId: string): string {
  const base = slugify(inputSlug && inputSlug.length > 0 ? inputSlug : title);
  if (base.length > 0) {
    return base;
  }

  return `story-${storyId.slice(0, 8)}`;
}

async function resolveUniqueSlug(
  client: ReturnType<typeof createServerSupabaseClient>,
  candidate: string,
  currentStoryId?: string,
) {
  const { data } = await client.from('stories').select('id').eq('slug', candidate).maybeSingle();

  if (!data || data.id === currentStoryId) {
    return candidate;
  }

  return `${candidate}-${crypto.randomUUID().slice(0, 6)}`;
}

export const POST: APIRoute = withApiErrorHandling(async (context) => {
  const guard = await requireAuthorContext(context);
  if (!guard) {
    return context.redirect('/auth/login?next=/author/stories', 302);
  }

  const { accessToken, authorContext } = guard;

  const formData = await context.request.formData();
  const commentsEnabled = formData.getAll('commentsEnabled').some((value) => value.toString() === 'true') ? 'true' : 'false';
  const indexable = formData.getAll('indexable').some((value) => value.toString() === 'true') ? 'true' : 'false';
  const parsed = saveStorySchema.safeParse({
    storyId: formData.get('storyId')?.toString(),
    title: formData.get('title')?.toString().trim(),
    subtitle: formData.get('subtitle')?.toString().trim() ?? '',
    slug: formData.get('slug')?.toString().trim() ?? '',
    tags: formData.get('tags')?.toString() ?? '',
    bodyHtml: formData.get('bodyHtml')?.toString() ?? '',
    bodyJson: formData.get('bodyJson')?.toString() ?? '{}',
    status: formData.get('status')?.toString(),
    commentsEnabled,
    indexable,
    kudosVisibility: formData.get('kudosVisibility')?.toString() ?? 'private',
    publishedAt: formData.get('publishedAt')?.toString() ?? '',
    existingCoverPath: formData.get('existingCoverPath')?.toString() ?? '',
  });

  if (!parsed.success) {
    return context.redirect('/author/stories?error=invalid_story_payload', 302);
  }

  const payload = parsed.data;
  const storyId = payload.storyId ?? crypto.randomUUID();

  const authorClient = createServerSupabaseClient({ accessToken });

  if (payload.storyId) {
    const { data: existing } = await authorClient
      .from('stories')
      .select('id, author_id')
      .eq('id', payload.storyId)
      .maybeSingle();

    if (!existing || existing.author_id !== authorContext.profile.id) {
      return context.redirect('/author/stories?error=story_not_found', 302);
    }
  }

  const slugBase = uniqueSlugCandidate(payload.slug, payload.title, storyId);
  const slug = await resolveUniqueSlug(authorClient, slugBase, payload.storyId);

  let coverPath = payload.existingCoverPath || null;
  const coverImage = formData.get('coverImage');

  if (coverImage instanceof File && coverImage.size > 0) {
    const extension = coverImage.name.includes('.')
      ? coverImage.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      : 'jpg';

    const filename = sanitizeFilename(coverImage.name.replace(/\.[^.]+$/, ''));
    const storagePath = `${authorContext.profile.id}/${storyId}/${filename}-${Date.now()}.${extension}`;

    const storageClient = createServiceRoleClient();
    const uploadResult = await storageClient.storage.from('story-covers').upload(storagePath, coverImage, {
      upsert: true,
      contentType: coverImage.type || 'image/jpeg',
    });

    if (uploadResult.error) {
      return context.redirect('/author/stories?error=cover_upload_failed', 302);
    }

    coverPath = storagePath;
  }

  let bodyJson: unknown = {};
  try {
    bodyJson = payload.bodyJson ? JSON.parse(payload.bodyJson) : {};
  } catch {
    bodyJson = {};
  }

  const publishedAt =
    payload.status === 'published'
      ? payload.publishedAt && payload.publishedAt.length > 0
        ? (() => {
            const date = new Date(payload.publishedAt);
            return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
          })()
        : new Date().toISOString()
      : null;

  const { error } = await authorClient.from('stories').upsert({
    id: storyId,
    author_id: authorContext.profile.id,
    title: payload.title,
    subtitle: payload.subtitle,
    slug,
    tags: parseTags(payload.tags ?? ''),
    body_html: payload.bodyHtml ?? '',
    body_json: bodyJson,
    status: payload.status,
    comments_enabled: payload.commentsEnabled !== 'false',
    indexable: payload.indexable !== 'false',
    kudos_visibility: payload.kudosVisibility,
    cover_image_path: coverPath,
    published_at: publishedAt,
  });

  if (error) {
    return context.redirect('/author/stories?error=story_save_failed', 302);
  }

  return context.redirect(`/author/stories?status=saved&id=${storyId}`, 302);
}, (context) => context.redirect('/author/stories?error=story_save_failed', 302));
