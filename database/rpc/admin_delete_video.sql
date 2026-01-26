-- ============================================
-- RPC FUNCTION: admin_delete_video
-- ============================================
-- WHY: Admin-only function to hide videos (soft delete)
-- Security: Only allows designated admin user to execute
-- Action: Sets hidden = true on the specified video
-- 
-- SCHEMA REQUIREMENTS:
-- - Requires videos.id to be BIGINT/INTEGER (numeric, not UUID)
-- - Requires videos.hidden column (boolean)
-- - Requires auth.uid() to match the designated admin UUID

CREATE OR REPLACE FUNCTION public.admin_delete_video(p_video_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := 77676986-1993-4ba2-b2b1-be5cb1315671;
BEGIN
  -- Only allow the designated admin
  IF auth.uid() IS NULL OR auth.uid() <> v_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.videos
  SET hidden = true
  WHERE id = p_video_id;

  RETURN jsonb_build_object(
    'ok', true,
    'video_id', p_video_id,
    'action', 'hidden_true'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_video(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_video(bigint) TO authenticated;
