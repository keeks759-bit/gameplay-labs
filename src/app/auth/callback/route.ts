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

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Check if profile exists
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
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
  }

  // Redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
