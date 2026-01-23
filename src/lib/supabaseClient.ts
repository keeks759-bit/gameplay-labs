/**
 * Singleton Supabase Client
 * 
 * WHY: Single instance of Supabase client for all client-side operations
 * Ensures consistent session management and prevents multiple client instances
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

// Create singleton instance
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
