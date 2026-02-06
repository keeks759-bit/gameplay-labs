/**
 * Auth Confirm Route
 * 
 * Handles token_hash verification for password recovery (cross-device safe)
 * Supabase email links: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');

  // Validate required params
  if (!tokenHash || !type) {
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', encodeURIComponent('Invalid reset link. Please request a new password reset.'));
    return NextResponse.redirect(forgotUrl);
  }

  // Only handle recovery type for password reset
  if (type !== 'recovery') {
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', encodeURIComponent('Invalid reset link type.'));
    return NextResponse.redirect(forgotUrl);
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify token_hash and establish session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (verifyError) {
      console.error('Token hash verification error:', verifyError);
      const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
      forgotUrl.searchParams.set('error', encodeURIComponent('Invalid or expired reset link. Please request a new password reset.'));
      return NextResponse.redirect(forgotUrl);
    }

    // Success: redirect to next URL or default to reset-password
    const redirectUrl = next || '/auth/reset-password';
    return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
  } catch (err) {
    console.error('Unexpected error in auth confirm:', err);
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', encodeURIComponent('An unexpected error occurred. Please try again.'));
    return NextResponse.redirect(forgotUrl);
  }
}
