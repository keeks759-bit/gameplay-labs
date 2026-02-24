-- ============================================
-- FUNCTION: vote_weight
-- ============================================
-- WHY: Returns the vote weight for a given user_id
--      Weighted accounts have higher vote_count impact
-- 
-- WEIGHTS:
-- - efreitas7289@gmail.com (admin) -> 33
-- - ebefe@aol.com -> 21
-- - marli325@aol.com -> 17
-- - Everyone else -> 1
--
-- TODO: Replace TODO_ADMIN_EMAIL_UUID, TODO_EBEFE_UUID, TODO_MARLI_UUID
--       with actual UUIDs from database/admin/lookup_weighted_user_ids.sql results

CREATE OR REPLACE FUNCTION public.vote_weight(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_user_id = 'TODO_ADMIN_EMAIL_UUID'::uuid THEN 33
    WHEN p_user_id = 'TODO_EBEFE_UUID'::uuid THEN 21
    WHEN p_user_id = 'TODO_MARLI_UUID'::uuid THEN 17
    ELSE 1
  END;
$$;
