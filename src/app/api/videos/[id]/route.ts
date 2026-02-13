/**
 * API Route: PATCH /api/videos/[id], DELETE /api/videos/[id]
 * 
 * WHY: Allow video owners to edit their video titles (PATCH)
 *      Allow video owners to delete their videos (DELETE)
 *      Allow admins to delete any video (DELETE)
 *      Enforces ownership at query level and RLS level
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { isAdminUserId } from '@/lib/security/admin';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16+ requires Promise)
    const { id: videoId } = await params;
    
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
    const { title } = body;
    
    // Validate title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const trimmedTitle = title.trim();
    
    // Max length validation (reasonable limit)
    if (trimmedTitle.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Validate video ID
    if (!videoId || isNaN(Number(videoId))) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Update video title (enforce ownership in WHERE clause)
    // Use maybeSingle() to avoid error when no rows match (not owner or not found)
    const { data: videoData, error: updateError } = await supabase
      .from('videos')
      .update({ title: trimmedTitle })
      .eq('id', Number(videoId))
      .eq('created_by', user.id) // Enforce ownership
      .select('id, title, created_at')
      .maybeSingle();

    if (updateError) {
      // True database/RPC error (not "no rows")
      console.error('[VIDEOS_PATCH] Update error:', {
        error: updateError,
        videoId: Number(videoId),
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update video' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // If no row updated, user is not owner or video doesn't exist
    if (!videoData) {
      return NextResponse.json(
        { error: 'Video not found or you do not have permission to edit it' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    console.log('[VIDEOS_PATCH] Video title updated successfully:', {
      videoId: Number(videoId),
      userId: user.id,
      newTitle: trimmedTitle,
    });

    return NextResponse.json(
      {
        ok: true,
        video: {
          id: videoData.id,
          title: videoData.title,
          created_at: videoData.created_at,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[VIDEOS_PATCH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16+ requires Promise)
    const { id: videoId } = await params;
    
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

    // Validate video ID
    if (!videoId || isNaN(Number(videoId))) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Check if user is admin
    const isAdmin = isAdminUserId(user.id);

    // Delete video
    // For admins: use service role client to bypass RLS
    // For normal users: use anon client with RLS enforcement
    let deletedVideo;
    let deleteError;

    if (isAdmin) {
      // Admin delete: use service role client to bypass RLS
      // Delete by id only (no ownership check needed)
      const { data, error } = await supabaseAdmin
        .from('videos')
        .delete()
        .eq('id', Number(videoId))
        .select('id')
        .maybeSingle();
      
      deletedVideo = data;
      deleteError = error;
    } else {
      // Normal user delete: use anon client with RLS enforcement
      // Enforce ownership in WHERE clause
      const { data, error } = await supabase
        .from('videos')
        .delete()
        .eq('id', Number(videoId))
        .eq('created_by', user.id) // Enforce ownership
        .select('id')
        .maybeSingle();
      
      deletedVideo = data;
      deleteError = error;
    }

    if (deleteError) {
      // True database/RPC error (not "no rows")
      console.error('[VIDEOS_DELETE] Delete error:', {
        error: deleteError,
        videoId: Number(videoId),
        userId: user.id,
        isAdmin,
      });
      return NextResponse.json(
        { error: 'Failed to delete video' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // If no row deleted, user is not owner (and not admin) or video doesn't exist
    if (!deletedVideo) {
      return NextResponse.json(
        { error: 'Video not found or you do not have permission to delete it' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    console.log('[VIDEOS_DELETE] Video deleted successfully:', {
      videoId: Number(videoId),
      userId: user.id,
      isAdmin,
    });

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[VIDEOS_DELETE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
