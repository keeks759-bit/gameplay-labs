-- RPC FUNCTION: cast_vote
-- ============================================
-- WHY: Atomic vote insertion with duplicate prevention
-- Uses vote_weight() to update videos.vote_count with weighted values
-- Idempotent: calling twice for same user/video does not double-increment
-- 
-- SCHEMA REQUIREMENTS:
-- - This function is for the LIVE numeric schema (not schema.sql)
-- - Requires videos.id to be BIGINT/INTEGER (numeric, not UUID)
-- - Requires votes.video_id to be BIGINT/INTEGER matching videos.id
-- - Requires UNIQUE(video_id, user_id) constraint on votes table
-- - Relies on public.vote_weight(user_id) to compute vote weight

CREATE OR REPLACE FUNCTION cast_vote(p_video_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_inserted boolean;
  v_daily_vote_count integer;
  v_utc_start_of_day timestamp with time zone;
  v_is_admin boolean;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('voted', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user is admin (admin UUIDs match src/lib/security/admin.ts)
  -- Admin UUIDs: e570e7ed-d901-4af3-b1a1-77e57772a51c, afb20822-fc72-42a5-8491-d9d4a96ff5b6
  v_is_admin := v_user_id IN (
    'e570e7ed-d901-4af3-b1a1-77e57772a51c'::uuid,
    'afb20822-fc72-42a5-8491-d9d4a96ff5b6'::uuid
  );
  
  -- Check daily vote cap (non-admin users only)
  IF NOT v_is_admin THEN
    -- Get start of current UTC day
    v_utc_start_of_day := date_trunc('day', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';
    
    -- Count votes created by this user today (UTC)
    SELECT COUNT(*) INTO v_daily_vote_count
    FROM votes
    WHERE user_id = v_user_id
      AND created_at >= v_utc_start_of_day;
    
    -- If daily limit reached, return error
    IF v_daily_vote_count >= 200 THEN
      RETURN jsonb_build_object(
        'voted', false,
        'error', 'Daily vote limit reached'
      );
    END IF;
  END IF;
  
  -- Attempt to insert vote (ON CONFLICT prevents duplicates)
  INSERT INTO votes (video_id, user_id)
  VALUES (p_video_id, v_user_id)
  ON CONFLICT (video_id, user_id) DO NOTHING;
  
  -- Check if insert actually occurred
  v_inserted := FOUND;
  
  -- Recalculate weighted vote_count from all current votes for this video.
  -- This avoids drift if previous logic changed or triggers were used.
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
  
  -- Return result
  IF v_inserted THEN
    RETURN jsonb_build_object('voted', true);
  ELSE
    RETURN jsonb_build_object('voted', false);
  END IF;
END;
$$;
