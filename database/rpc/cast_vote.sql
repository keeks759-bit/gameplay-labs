-- ============================================
-- RPC FUNCTION: cast_vote
-- ============================================
-- WHY: Atomic vote insertion with duplicate prevention
-- Uses existing trigger to update vote_count automatically
-- Idempotent: calling twice for same user/video does not double-increment
-- 
-- SCHEMA REQUIREMENTS:
-- - This function is for the LIVE numeric schema (not schema.sql)
-- - Requires videos.id to be BIGINT/INTEGER (numeric, not UUID)
-- - Requires votes.video_id to be BIGINT/INTEGER matching videos.id
-- - Requires UNIQUE(video_id, user_id) constraint on votes table
-- - Relies on existing trigger (update_vote_count_trigger) to update videos.vote_count
--   If the trigger does not exist, vote_count will not auto-increment

CREATE OR REPLACE FUNCTION cast_vote(p_video_id bigint)
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
