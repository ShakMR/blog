export interface StoryRecord {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  tags: string[];
  body_html: string;
  body_json: unknown;
  status: 'draft' | 'published';
  comments_enabled: boolean;
  kudos_visibility: 'disabled' | 'private' | 'public';
  cover_image_path: string | null;
  published_at: string | null;
  draft_access_token: string;
  updated_at: string;
  created_at: string;
  author_id: string;
}
