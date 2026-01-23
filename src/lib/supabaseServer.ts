/**
 * Admin Supabase Client (Server-Only)
 * 
 * WHY: Uses service role key for admin operations that bypass RLS
 * MUST ONLY be used in server-side API routes, never exposed to client
 * 
 * WARNING: This client has full database access. Use with extreme caution.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase admin environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local'
  );
}

/**
 * Admin Supabase client with service role key
 * This bypasses RLS and should ONLY be used in server-side API routes
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
