-- Add platform column to videos table
-- Allowed values: pc, xbox, playstation, switch, mobile, other, or null

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add check constraint to ensure only allowed values
ALTER TABLE public.videos
DROP CONSTRAINT IF EXISTS videos_platform_check;

ALTER TABLE public.videos
ADD CONSTRAINT videos_platform_check
CHECK (platform IS NULL OR platform IN ('pc', 'xbox', 'playstation', 'switch', 'mobile', 'other'));

-- Create RPC function for admin to update video platform
-- NOTE: Uses bigint for video_id to match actual database schema (not UUID)
CREATE OR REPLACE FUNCTION public.admin_update_video_platform(
  p_video_id bigint,
  p_platform text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := 'e570e7ed-d901-4af3-b1a1-77e57772a51c';
  v_platform text;
BEGIN
  -- Only allow the designated admin
  IF auth.uid() IS NULL OR auth.uid() <> v_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  
  -- Validate platform value if provided
  IF p_platform IS NOT NULL AND p_platform != '' THEN
    -- Normalize to lowercase
    v_platform := lower(trim(p_platform));
    IF v_platform NOT IN ('pc', 'xbox', 'playstation', 'switch', 'mobile', 'other') THEN
      RAISE EXCEPTION 'Invalid platform value. Allowed: pc, xbox, playstation, switch, mobile, other';
    END IF;
  ELSE
    v_platform := NULL;
  END IF;
  
  -- Update the video platform
  UPDATE public.videos
  SET platform = v_platform
  WHERE id = p_video_id;
  
  RETURN jsonb_build_object(
    'ok', true,
    'video_id', p_video_id,
    'platform', v_platform
  );
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
REVOKE ALL ON FUNCTION public.admin_update_video_platform(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_video_platform(bigint, text) TO authenticated;
