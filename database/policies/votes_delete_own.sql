-- ============================================
-- VOTES DELETE POLICY: Users can delete their own votes
-- ============================================
-- WHY: Allow users to unvote (remove their own votes)
--      Enforces ownership at RLS level

CREATE POLICY "votes: delete own"
  ON public.votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
