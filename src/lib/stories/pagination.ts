import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryRecord } from './types';

export const STORIES_PAGE_SIZE = 12;

/** Parse a `?page=` value into a 1-based page number (defaults to 1). */
export function parsePageParam(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export interface StoriesPage {
  stories: StoryRecord[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Fetch one page of published stories (newest first). Reads one extra row to
 * detect whether a following page exists without a separate count query.
 */
export async function getPublishedStoriesPage(
  supabase: SupabaseClient,
  page: number,
  pageSize: number = STORIES_PAGE_SIZE,
): Promise<StoriesPage> {
  const safePage = page >= 1 ? page : 1;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize; // inclusive range -> pageSize + 1 rows

  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as StoryRecord[];
  const hasNext = rows.length > pageSize;

  return {
    stories: rows.slice(0, pageSize),
    page: safePage,
    hasPrev: safePage > 1,
    hasNext,
  };
}
