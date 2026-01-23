-- Add video_url column to videos table for Supabase Storage URLs
-- WHY: Store public URLs from Supabase Storage bucket 'videos'
-- This is in addition to playback_id (which was for Cloudflare Stream)

ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN videos.video_url IS 'Public URL from Supabase Storage bucket videos';
