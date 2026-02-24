-- ============================================
-- LOOKUP WEIGHTED USER UUIDs
-- ============================================
-- WHY: Get UUIDs for the 3 weighted accounts so we can implement vote_weight function
-- 
-- INSTRUCTIONS:
-- 1. Run this in Supabase SQL Editor (it has access to auth.users)
-- 2. Copy the UUIDs from the results
-- 3. Replace TODO placeholders in database/functions/vote_weight.sql with actual UUIDs

-- Lookup the UUIDs we need for weighting
SELECT id, email
FROM auth.users
WHERE email IN (
  'efreitas7289@gmail.com',
  'ebefe@aol.com',
  'marli325@aol.com'
)
ORDER BY email;
