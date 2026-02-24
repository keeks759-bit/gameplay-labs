/**
 * API Route: POST /api/votes, DELETE /api/votes
 * 
 * WHY: Wrapper around Supabase RPC cast_vote to return proper HTTP status codes
 *      Enforces daily vote cap at DB layer (RPC), returns 429 when limit reached
 *      DELETE handler allows users to unvote (remove their own votes) via undo_vote RPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

// In-memory rate limiter (best-effort, serverless-friendly)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { ok: true };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}

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

    // Rate limiting (after auth check, before RPC call)
    // Key: authenticated user ID only
    const rateLimitKey = `user:${user.id}`;
    
    // Check rate limit: 30 requests per 60 seconds
    const rateLimitResult = checkRateLimit(rateLimitKey, 30, 60 * 1000);
    
    if (!rateLimitResult.ok) {
      console.warn('[VOTES_POST] Rate limit exceeded:', {
        userId: user.id,
        path: request.nextUrl.pathname,
        retryAfterSec: rateLimitResult.retryAfterSec,
      });
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': rateLimitResult.retryAfterSec.toString(),
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

export async function DELETE(request: NextRequest) {
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

    // Call RPC function to undo vote (unvote)
    const { data: rpcData, error: rpcError } = await supabase.rpc('undo_vote', {
      p_video_id: video_id,
    });

    if (rpcError) {
      console.error('[VOTES_DELETE] RPC error:', {
        error: rpcError,
        videoId: video_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to delete vote' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Handle RPC-level errors
    if (rpcData && rpcData.error === 'Not authenticated') {
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

    if (rpcData && rpcData.error === 'Vote not found') {
      return NextResponse.json(
        { error: 'Vote not found' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    console.log('[VOTES_DELETE] Vote deleted successfully:', {
      videoId: video_id,
      userId: user.id,
    });

    return NextResponse.json(
      { ok: true, unvoted: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[VOTES_DELETE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vote' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
