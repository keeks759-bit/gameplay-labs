/**
 * Profile Requirement Helper
 * 
 * Checks if user is logged in and has a profile
 * Returns user and hasProfile status
 */
import { supabase } from '@/lib/supabaseClient';

export type ProfileCheckResult = {
  user: { id: string } | null;
  hasProfile: boolean;
};

export async function requireProfile(): Promise<ProfileCheckResult> {
  // Get user
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  
  if (getUserError || !user) {
    return { user: null, hasProfile: false };
  }

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  // If there's an error (not just "no rows"), treat as no profile
  if (profileError && profileError.code !== 'PGRST116') {
    return { user: { id: user.id }, hasProfile: false };
  }

  return {
    user: { id: user.id },
    hasProfile: !!profile,
  };
}
