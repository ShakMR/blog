export interface CommentRecord {
  id: string;
  story_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export type CommentSubmissionError =
  | 'invalid_payload'
  | 'spam_detected'
  | 'challenge_failed'
  | 'comments_closed'
  | 'rate_limited'
  | 'submit_failed';

export interface CommentRateLimitState {
  attempt_count: number;
  window_start: string;
}
