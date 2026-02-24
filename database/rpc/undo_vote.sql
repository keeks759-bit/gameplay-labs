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
  v_deleted boolean;
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
  
  v_deleted := FOUND;
  
  -- If a row was deleted, apply weighted decrement
  IF v_deleted THEN
    UPDATE videos
    SET vote_count = GREATEST(0, vote_count - public.vote_weight(v_user_id))
    WHERE id = p_video_id;
    
    RETURN jsonb_build_object('unvoted', true);
  END IF;
  
  -- No row deleted -> vote not found
  RETURN jsonb_build_object('unvoted', false, 'error', 'Vote not found');
END;
$$;

