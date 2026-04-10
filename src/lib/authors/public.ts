import type { Database } from '../../types/database';
import { createServerSupabaseClient, createServiceRoleClient } from '../supabase/server';
import type { GrammaticalGender } from './utils';

type AuthorBaseRow = Database['public']['Tables']['authors']['Row'];

export interface PublicAuthor {
  id: string;
  slug: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  grammatical_gender: GrammaticalGender;
}

interface ProfileRow {
  id: string;
  display_name: string;
}

function toPublicAuthor(row: {
  id: string;
  slug: string;
  display_name?: string | null;
  bio: string;
  avatar_path: string | null;
  grammatical_gender?: GrammaticalGender | null;
}): PublicAuthor {
  return {
    id: row.id,
    slug: row.slug,
    display_name: row.display_name?.trim() ?? '',
    bio: row.bio,
    avatar_path: row.avatar_path,
    grammatical_gender: row.grammatical_gender ?? 'neutral',
  };
}

async function getProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map();
  }

  const serviceClient = createServiceRoleClient();
  const { data } = await serviceClient
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);

  const profiles = (data ?? []) as ProfileRow[];
  return new Map(profiles.map((profile) => [profile.id, profile.display_name]));
}

async function enrichLegacyAuthors(rows: AuthorBaseRow[]): Promise<PublicAuthor[]> {
  const profileNames = await getProfileNames(rows.map((row) => row.id));

  return rows.map((row) =>
    toPublicAuthor({
      id: row.id,
      slug: row.slug,
      display_name: profileNames.get(row.id) ?? '',
      bio: row.bio,
      avatar_path: row.avatar_path,
      grammatical_gender: 'neutral',
    }),
  );
}

export async function getPublicAuthorsByIds(ids: string[]): Promise<Map<string, PublicAuthor>> {
  if (ids.length === 0) {
    return new Map();
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id, slug, display_name, bio, avatar_path, grammatical_gender')
    .in('id', ids);

  let authors: PublicAuthor[];

  if (error) {
    const legacy = await supabase.from('authors').select('id, slug, bio, avatar_path').in('id', ids);
    authors = await enrichLegacyAuthors((legacy.data ?? []) as AuthorBaseRow[]);
  } else {
    const rows = (data ?? []) as Array<{
      id: string;
      slug: string;
      display_name: string | null;
      bio: string;
      avatar_path: string | null;
      grammatical_gender: GrammaticalGender | null;
    }>;
    authors = rows.map(toPublicAuthor);
  }

  return new Map(authors.map((author) => [author.id, author]));
}

export async function getPublicAuthors(): Promise<PublicAuthor[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id, slug, display_name, bio, avatar_path, grammatical_gender')
    .order('display_name', { ascending: true });

  if (error) {
    const legacy = await supabase.from('authors').select('id, slug, bio, avatar_path').order('slug', { ascending: true });
    return enrichLegacyAuthors((legacy.data ?? []) as AuthorBaseRow[]);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    display_name: string | null;
    bio: string;
    avatar_path: string | null;
    grammatical_gender: GrammaticalGender | null;
  }>;
  return rows.map(toPublicAuthor);
}

export async function getPublicAuthorBySlug(slug: string): Promise<PublicAuthor | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id, slug, display_name, bio, avatar_path, grammatical_gender')
    .eq('slug', slug)
    .maybeSingle();

  if (!error && data) {
    return toPublicAuthor(data);
  }

  const legacy = await supabase
    .from('authors')
    .select('id, slug, bio, avatar_path')
    .eq('slug', slug)
    .maybeSingle();

  if (!legacy.data) {
    return null;
  }

  const profileNames = await getProfileNames([legacy.data.id]);
  return toPublicAuthor({
    id: legacy.data.id,
    slug: legacy.data.slug,
    display_name: profileNames.get(legacy.data.id) ?? '',
    bio: legacy.data.bio,
    avatar_path: legacy.data.avatar_path,
    grammatical_gender: 'neutral',
  });
}
