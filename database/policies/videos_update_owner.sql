-- ============================================
-- VIDEOS UPDATE POLICY: Owners can update their own videos
-- ============================================
-- WHY: Allow video owners to edit their video titles and other fields
--      Enforces ownership at RLS level

CREATE POLICY "Video owners can update their own videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
