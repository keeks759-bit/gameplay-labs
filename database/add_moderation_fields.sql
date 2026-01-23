-- ============================================
-- MODERATION FOUNDATION - DATABASE MIGRATION
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Adds moderation fields to videos and creates video_reports table

-- ============================================
-- 1. ADD MODERATION FIELDS TO VIDEOS TABLE
-- ============================================
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT NULL;

-- Add check constraint for status values
ALTER TABLE public.videos
ADD CONSTRAINT videos_status_check CHECK (status IN ('active', 'hidden', 'removed'));

-- Update existing videos to have status='active' (if they were using hidden=false)
UPDATE public.videos
SET status = CASE 
  WHEN hidden = true THEN 'hidden'
  ELSE 'active'
END
WHERE status IS NULL OR status = '';

-- Create index for status filtering (common query)
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- ============================================
-- 2. CREATE VIDEO_REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.video_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, reporter_id) -- Prevents duplicate reports from same user
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_video_reports_video_id ON public.video_reports(video_id);
CREATE INDEX IF NOT EXISTS idx_video_reports_reporter_id ON public.video_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_video_reports_created_at ON public.video_reports(created_at DESC);

-- ============================================
-- 3. ENABLE RLS ON VIDEO_REPORTS
-- ============================================
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can INSERT their own reports
CREATE POLICY "Users can insert their own reports"
ON public.video_reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Policy: Authenticated users can SELECT only their own reports
CREATE POLICY "Users can view their own reports"
ON public.video_reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- No UPDATE/DELETE policies (deny by default for client access)
