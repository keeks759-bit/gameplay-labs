-- ============================================
-- RPC FUNCTION: undo_vote
-- ============================================
-- WHY: Allow users to "unvote" (undo their like) on a video
--      Removes the vote row AND applies the correct weighted decrement
-- 
-- SCHEMA REQUIREMENTS:
-- - LIVE numeric schema (videos.id BIGINT/INTEGER, votes.video_id BIGINT/INTEGER)
-- - UNIQUE(video_id, user_id) constraint on votes table
-- - public.vote_weight(user_id) must be defined

CREATE OR REPLACE FUNCTION undo_vote(p_video_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('unvoted', false, 'error', 'Not authenticated');
  END IF;
  
  -- Delete the user's vote for this video
  DELETE FROM votes
  WHERE video_id = p_video_id
    AND user_id = v_user_id;
  
  -- Recalculate weighted vote_count from all current votes for this video.
  -- This keeps vote_count consistent even if previous logic or weights changed.
  UPDATE videos v
  SET vote_count = COALESCE(
    (
      SELECT SUM(public.vote_weight(votes.user_id))
      FROM votes
      WHERE votes.video_id = v.id
    ),
    0
  )
  WHERE v.id = p_video_id;
  
  -- If a row was deleted, report unvoted=true; otherwise, treat as no-op
  IF FOUND THEN
    RETURN jsonb_build_object('unvoted', true);
  END IF;
  
  -- No row deleted -> vote not found (idempotent "no-op")
  RETURN jsonb_build_object('unvoted', false, 'error', 'Vote not found');
END;
$$;

