/**
 * Auth Callback Route
 * 
 * Handles email confirmation redirects from Supabase
 * After user clicks email confirmation link, Supabase redirects here
 * We exchange the code for a session and check if profile exists
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const type = requestUrl.searchParams.get('type'); // 'recovery' for password reset links (from Supabase)
  const recovery = requestUrl.searchParams.get('recovery'); // Custom param we add to redirectTo
  
  // Check if this is a recovery flow
  // Supabase password recovery links should include type=recovery, but we also check
  // our custom 'recovery' param that we add to redirectTo in resetPasswordForEmail
  const isRecoveryFlow = type === 'recovery' || recovery === 'true';

  // Handle error cases (e.g., expired token, invalid code)
  if (error) {
    const errorMessage = errorDescription || error || 'Authentication failed';
    console.error('Auth callback error:', { error, errorDescription });
    
    // Redirect to login with error message (or reset-password if it was a recovery flow)
    if (isRecoveryFlow) {
      const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
      resetUrl.searchParams.set('error', encodeURIComponent(errorMessage));
      return NextResponse.redirect(resetUrl);
    }
    
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', encodeURIComponent(errorMessage));
    return NextResponse.redirect(loginUrl);
  }

  // Handle code exchange
  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        
        // If recovery flow, redirect to reset-password with error
        if (isRecoveryFlow) {
          const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
          resetUrl.searchParams.set('error', encodeURIComponent(exchangeError.message || 'Failed to verify reset link'));
          return NextResponse.redirect(resetUrl);
        }
        
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', encodeURIComponent(exchangeError.message || 'Failed to verify email'));
        return NextResponse.redirect(loginUrl);
      }
      
      // If this is a password recovery flow, redirect to reset-password page
      // We check both type=recovery (from Supabase) and recovery=true (our custom param)
      if (isRecoveryFlow) {
        return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
      }
      
      // Check if profile exists (only for non-recovery flows)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Get user error:', userError);
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', encodeURIComponent('Failed to retrieve user'));
        return NextResponse.redirect(loginUrl);
      }
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        // Redirect to profile if it doesn't exist
        if (!profile) {
          return NextResponse.redirect(new URL('/profile', requestUrl.origin));
        }
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      
      // If recovery flow, redirect to reset-password with error
      if (isRecoveryFlow) {
        const resetUrl = new URL('/auth/reset-password', requestUrl.origin);
        resetUrl.searchParams.set('error', encodeURIComponent('An unexpected error occurred'));
        return NextResponse.redirect(resetUrl);
      }
      
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', encodeURIComponent('An unexpected error occurred'));
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to home page on success (fallback for non-recovery flows)
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
