-- ============================================
-- VIDEOS DELETE POLICY: Owners can delete their own videos
-- ============================================
-- WHY: Allow video owners to delete their own videos
--      Enforces ownership at RLS level
--      Admins can delete any video via API route (server-side check)

CREATE POLICY "Video owners can delete their own videos"
  ON videos FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
