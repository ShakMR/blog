export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'admin' | 'author';
          display_name: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
      };
      authors: {
        Row: {
          id: string;
          slug: string;
          bio: string;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          subtitle: string;
          slug: string;
          tags: string[];
          body_json: Json;
          body_html: string;
          status: 'draft' | 'published';
          comments_enabled: boolean;
          cover_image_path: string | null;
          published_at: string | null;
          draft_access_token: string;
          created_at: string;
          updated_at: string;
        };
      };
      comments: {
        Row: {
          id: string;
          story_id: string;
          author_name: string;
          body: string;
          author_email_hash: string | null;
          user_agent: string | null;
          source_ip: string | null;
          created_at: string;
        };
      };
    };
  };
}
