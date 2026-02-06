/**
 * Auth Confirm Route
 * 
 * Handles token_hash verification for password recovery (cross-device safe)
 * Supabase email links: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
 */
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');

  // Validate required params
  if (!tokenHash || !type) {
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', 'Invalid reset link. Please request a new password reset.');
    return NextResponse.redirect(forgotUrl);
  }

  // Only handle recovery type for password reset
  if (type !== 'recovery') {
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', 'Invalid reset link type.');
    return NextResponse.redirect(forgotUrl);
  }

  // Create response object that will capture cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Store cookie options to preserve them exactly
  const cookieOptionsMap = new Map<string, Record<string, unknown>>();

  try {
    // Create Supabase client with cookie-aware response handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            // Store original options for each cookie
            cookiesToSet.forEach(({ name, value, options }) => {
              if (options) {
                cookieOptionsMap.set(name, options);
              }
            });
            
            // Create new response and set cookies with original options
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options || {})
            );
          },
        },
      }
    );
    
    // Verify token_hash and establish session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (verifyError) {
      console.error('Token hash verification error:', verifyError);
      const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
      const errorMsg = verifyError.message 
        ? `Invalid or expired reset link: ${verifyError.message}. Please request a new password reset.`
        : 'Invalid or expired reset link. Please request a new password reset.';
      forgotUrl.searchParams.set('error', errorMsg);
      return NextResponse.redirect(forgotUrl);
    }

    // Post-verify sanity check: confirm session exists
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session check failed after verifyOtp:', sessionError);
      const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
      forgotUrl.searchParams.set('error', 'Failed to establish session. Please request a new password reset.');
      return NextResponse.redirect(forgotUrl);
    }

    // Success: redirect to next URL or default to reset-password
    // Create redirect response and copy cookies with their original options
    const redirectUrl = next || '/auth/reset-password';
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
    
    // Copy cookies from the verifyOtp response to the redirect response with original options
    response.cookies.getAll().forEach((cookie) => {
      const originalOptions = cookieOptionsMap.get(cookie.name) || {};
      redirectResponse.cookies.set(cookie.name, cookie.value, originalOptions);
    });
    
    return redirectResponse;
  } catch (err) {
    console.error('Unexpected error in auth confirm:', err);
    const forgotUrl = new URL('/auth/forgot-password', requestUrl.origin);
    forgotUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.');
    return NextResponse.redirect(forgotUrl);
  }
}
