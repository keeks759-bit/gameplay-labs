/**
 * API Route: POST /api/votes
 * 
 * WHY: Wrapper around Supabase RPC cast_vote to return proper HTTP status codes
 *      Enforces daily vote cap at DB layer (RPC), returns 429 when limit reached
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with cookie access for route handler
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in route handlers
            }
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { video_id } = body;
    
    // Validate video_id
    if (!video_id || typeof video_id !== 'number' || !Number.isFinite(video_id) || video_id <= 0) {
      return NextResponse.json(
        { error: 'Invalid video_id' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Call RPC function to cast vote
    const { data: rpcData, error: rpcError } = await supabase.rpc('cast_vote', {
      p_video_id: video_id,
    });

    if (rpcError) {
      console.error('[VOTES_POST] RPC error:', {
        error: rpcError,
        videoId: video_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to cast vote' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Check for daily vote limit error from RPC
    if (rpcData && rpcData.error === 'Daily vote limit reached') {
      console.warn('[VOTES_POST] Daily vote limit reached:', {
        videoId: video_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Daily vote limit reached' },
        { 
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Success - return RPC response
    return NextResponse.json(
      rpcData || { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[VOTES_POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
