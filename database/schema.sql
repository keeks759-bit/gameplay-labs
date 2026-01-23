-- ============================================
-- GAMEPLAY PLATFORM - DATABASE SCHEMA
-- ============================================
-- WARNING: This schema.sql file defines UUID-based IDs (videos.id, votes.video_id)
-- but the currently connected Supabase project appears to use NUMERIC/BIGINT IDs.
-- 
-- DO NOT deploy this schema blindly without first reconciling ID types.
-- The app is currently operating with numeric video IDs (based on API responses).
-- 
-- For the live numeric schema, see:
-- - database/rpc/cast_vote.sql (RPC function for numeric IDs)
-- 
-- Run this SQL in your Supabase SQL Editor
-- This creates all tables with proper constraints and indexes

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
-- Stores game categories (e.g., "Valorant", "CS2", "Fortnite")
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. VIDEOS TABLE
-- ============================================
-- Stores video clips with Cloudflare Stream playback_id
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  playback_id TEXT NOT NULL, -- Cloudflare Stream playback ID
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vote_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 3. VOTES TABLE
-- ============================================
-- Tracks user votes (one vote per user per video)
-- Unique constraint prevents duplicate votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id) -- Prevents duplicate votes at DB level
);

-- ============================================
-- 4. REPORTS TABLE
-- ============================================
-- Stores content reports for moderation
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- WHY: Speed up common queries (homepage, top page, filtering)

CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_vote_count ON videos(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_hidden ON videos(hidden) WHERE hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_votes_video_id ON votes(video_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_video_id ON reports(video_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- WHY: Security at database level, not application level
-- Prevents unauthorized access even if app code has bugs

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CATEGORIES POLICIES
-- ============================================
-- Public read access (anyone can see categories)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- ============================================
-- VIDEOS POLICIES
-- ============================================
-- Public read access for non-hidden videos only
CREATE POLICY "Videos are viewable by everyone if not hidden"
  ON videos FOR SELECT
  USING (hidden = FALSE);

-- ============================================
-- VOTES POLICIES
-- ============================================
-- Public read access (anyone can see vote counts)
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

-- ============================================
-- REPORTS POLICIES
-- ============================================
-- No public access (reports are private)
-- Will add authenticated insert policy in Phase 3

-- ============================================
-- HELPER FUNCTION: Update vote_count
-- ============================================
-- WHY: Keep vote_count in sync with votes table
-- This runs automatically when votes are added/removed

CREATE OR REPLACE FUNCTION update_video_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET vote_count = vote_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET vote_count = vote_count - 1 WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update vote_count
CREATE TRIGGER update_vote_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_video_vote_count();

-- ============================================
-- RPC FUNCTION: cast_vote
-- ============================================
-- WHY: Atomic vote insertion with duplicate prevention
-- Uses existing trigger to update vote_count automatically
-- Idempotent: calling twice for same user/video does not double-increment

CREATE OR REPLACE FUNCTION cast_vote(p_video_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_inserted boolean;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('voted', false, 'error', 'Not authenticated');
  END IF;
  
  -- Attempt to insert vote (ON CONFLICT prevents duplicates)
  INSERT INTO votes (video_id, user_id)
  VALUES (p_video_id, v_user_id)
  ON CONFLICT (video_id, user_id) DO NOTHING;
  
  -- Check if insert actually occurred
  v_inserted := FOUND;
  
  -- Return result
  IF v_inserted THEN
    RETURN jsonb_build_object('voted', true);
  ELSE
    RETURN jsonb_build_object('voted', false);
  END IF;
END;
$$;
