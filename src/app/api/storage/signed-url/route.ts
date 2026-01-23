/**
 * API Route: Generate signed URL for video playback
 * 
 * GET /api/storage/signed-url?path=<storage_path>
 * 
 * WHY: Uses server-side admin client to generate signed URLs
 * This ensures videos are only accessible to authenticated users
 * and avoids public URL bucket configuration issues
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Bucket configuration
const BUCKET_NAME = 'videos';
const BUCKET_IS_PUBLIC = true; // Set to false if bucket is private

// Lazy import admin client only if needed (for private buckets)
async function getAdminClient() {
  if (BUCKET_IS_PUBLIC) {
    return null; // Not needed for public buckets
  }
  const { supabaseAdmin } = await import('@/lib/supabaseServer');
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  // Wrap entire handler in try/catch to NEVER throw
  try {
    // Log incoming request
    console.log('[SIGNED_URL] incoming', { url: request.url });

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[SIGNED_URL] missing env vars');
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing environment variables',
          where: 'env_check',
          details: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
        },
        { status: 500 }
      );
    }


    // Get storage path from query params
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const bucket = BUCKET_NAME;

    console.log('[SIGNED_URL] params', { bucket, path });

    if (!path) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing path parameter',
          where: 'param_validation',
          details: { bucket },
        },
        { status: 400 }
      );
    }

    // Validate user is logged in using regular server client
    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (clientError) {
      console.error('[SIGNED_URL] failed to create server client', clientError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to initialize Supabase client',
          where: 'client_init',
          details: clientError instanceof Error ? clientError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    let user;
    let userErr;
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user ?? null;
      userErr = authResult.error ?? null;
    } catch (authError) {
      console.error('[SIGNED_URL] auth.getUser() threw', authError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Authentication check failed',
          where: 'auth_check',
          details: authError instanceof Error ? authError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    console.log('[SIGNED_URL] auth', { hasUser: !!user, userId: user?.id?.substring(0, 8) });

    if (userErr || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Not authenticated',
          where: 'auth_check',
          details: userErr ? userErr.message : 'No user found',
        },
        { status: 401 }
      );
    }

    // Generate URL based on bucket privacy
    try {
      if (BUCKET_IS_PUBLIC) {
        // Use public URL for public buckets (can use regular client)
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        if (!publicData?.publicUrl) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Failed to generate public URL',
              where: 'public_url_generation',
              details: { bucket, path },
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          url: publicData.publicUrl,
          kind: 'public',
        });
      } else {
        // Use signed URL for private buckets (requires admin client)
        const adminClient = await getAdminClient();
        if (!adminClient) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Admin client not available',
              where: 'admin_client_init',
              details: { bucket },
            },
            { status: 500 }
          );
        }

        const { data, error: signedUrlError } = await adminClient.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60); // 1 hour expiry

        if (signedUrlError) {
          console.error('[SIGNED_URL] supabase error', signedUrlError);
          return NextResponse.json(
            {
              ok: false,
              error: signedUrlError.message || 'Failed to generate signed URL',
              where: 'signed_url_generation',
              details: {
                bucket,
                path,
                supabaseError: signedUrlError.message,
              },
            },
            { status: 500 }
          );
        }

        if (!data?.signedUrl) {
          return NextResponse.json(
            {
              ok: false,
              error: 'No signed URL in response',
              where: 'signed_url_response',
              details: { bucket, path },
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          url: data.signedUrl,
          kind: 'signed',
        });
      }
    } catch (storageError) {
      console.error('[SIGNED_URL] storage operation threw', storageError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Storage operation failed',
          where: 'storage_operation',
          details: storageError instanceof Error ? storageError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('[SIGNED_URL] unexpected exception', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        where: 'unexpected_exception',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
