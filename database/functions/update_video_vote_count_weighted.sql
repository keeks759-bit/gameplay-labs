-- ============================================
-- FUNCTION: update_video_vote_count (WEIGHTED VERSION)
-- ============================================
-- WHY: Keep vote_count in sync with votes table using weighted values
--      This replaces the original update_video_vote_count() function
--      Weighted accounts contribute 33/21/17 instead of 1
--
-- IMPORTANT:
-- - This function uses public.vote_weight() to determine vote weight
-- - On INSERT: adds vote_weight(NEW.user_id) to vote_count
-- - On DELETE: subtracts vote_weight(OLD.user_id) from vote_count
-- - Uses GREATEST(0, ...) to prevent negative vote_count

CREATE OR REPLACE FUNCTION update_video_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos 
    SET vote_count = vote_count + public.vote_weight(NEW.user_id) 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos 
    SET vote_count = GREATEST(0, vote_count - public.vote_weight(OLD.user_id)) 
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
