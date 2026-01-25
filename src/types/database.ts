/**
 * TypeScript types for database tables
 * 
 * WHY: Type safety when working with Supabase data
 * These match the SQL schema exactly
 */

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Video = {
  id: string;
  title: string;
  game_title: string | null;
  category_id: string | null;
  playback_id: string;
  video_url: string | null; // Supabase Storage path (e.g., "userId/timestamp-filename.mov")
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  vote_count: number;
  hidden: boolean;
  status: 'active' | 'hidden' | 'removed';
  moderated_at: string | null;
  moderation_reason: string | null;
};

export type VideoReport = {
  id: string;
  video_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  created_at: string;
};

export type VideoWithCategory = Video & {
  categories: Category | null;
};

export type Vote = {
  id: string;
  video_id: string;
  user_id: string;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  platforms: string[];
  favorite_genres: string[];
  primary_games: string | null;
  region: string | null;
  playstyle: string | null;
};
