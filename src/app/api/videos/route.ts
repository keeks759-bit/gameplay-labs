/**
 * API Route: GET /api/videos, POST /api/videos
 * 
 * WHY: Server-side data fetching for videos (GET)
 *      Server-side video creation with Cloudflare Stream support (POST)
 * Fetches videos with categories, sorted by vote_count and created_at
 * Only shows videos with status='active'
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VideoWithCategory } from '@/types/database';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'votes'; // 'votes' or 'newest'
    
    // Parse pagination params
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '12', 10), 1), 50);
    
    // Parse cursor params
    const cursorCreatedAt = searchParams.get('cursor_created_at');
    const cursorCreatedAtQuoted =
      cursorCreatedAt ? `"${cursorCreatedAt.replaceAll('"', '\\"')}"` : null;
    const cursorIdParam = searchParams.get('cursor_id');
    const cursorId = cursorIdParam ? parseInt(cursorIdParam, 10) : null;
    const cursorVoteCountParam = searchParams.get('cursor_vote_count');
    const cursorVoteCount = cursorVoteCountParam ? parseInt(cursorVoteCountParam, 10) : null;

    // Parse category filter
    const categoryIdParam = searchParams.get('category_id');
    const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : null;

    // Build query
    let query = supabase
      .from('videos')
      .select(`
        *,
        categories:categories!category_id (*),
        profiles:profiles!created_by(display_name)
      `)
      .eq('hidden', false);

    // Apply category filter if provided
    if (categoryId !== null && !isNaN(categoryId)) {
      query = query.eq('category_id', categoryId);
    }

    // Apply cursor filters and sorting based on sort mode
    if (sortBy === 'votes') {
      // Sort by votes, then by date, then by id as tiebreaker
      query = query
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      
      // Apply cursor filter for vote-based pagination
      // PostgREST filter: (vote_count < cursor) OR (vote_count = cursor AND created_at < cursor) OR (vote_count = cursor AND created_at = cursor AND id < cursor)
      if (cursorVoteCount !== null && cursorCreatedAtQuoted && cursorId !== null) {
        const voteFilterParts = [
          `and(vote_count.lt.${cursorVoteCount})`,
          `and(vote_count.eq.${cursorVoteCount},created_at.lt.${cursorCreatedAtQuoted})`,
          `and(vote_count.eq.${cursorVoteCount},created_at.eq.${cursorCreatedAtQuoted},id.lt.${cursorId})`,
        ];
        const filterStr = voteFilterParts.join(',');
        query = query.or(filterStr);
      }
    } else {
      // Sort by newest first, then by id as tiebreaker
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      
      // Apply cursor filter for newest-based pagination
      // PostgREST filter: (created_at < cursor) OR (created_at = cursor AND id < cursor)
      if (cursorCreatedAtQuoted && cursorId !== null) {
        const newestFilterParts = [
          `created_at.lt.${cursorCreatedAtQuoted}`,
          `and(created_at.eq.${cursorCreatedAtQuoted},id.lt.${cursorId})`,
        ];
        const filterStr = newestFilterParts.join(',');
        query = query.or(filterStr);
      }
    }

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching videos:', error);
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json(
          {
            error: 'Failed to fetch videos',
            supabase: {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    // Transform data to match VideoWithCategory type
    const videos: VideoWithCategory[] = (data || []).map((video: any) => {
      const displayName = video.profiles?.display_name;
      return {
        ...video,
        categories: video.categories || null,
        uploader_username: displayName && displayName.trim() ? displayName.trim() : null,
      };
    });

    // Calculate nextCursor from last video
    let nextCursor: { vote_count?: number; created_at: string; id: number } | null = null;
    if (videos.length > 0 && videos.length === limit) {
      const lastVideo = videos[videos.length - 1];
      if (sortBy === 'votes') {
        nextCursor = {
          vote_count: lastVideo.vote_count,
          created_at: lastVideo.created_at,
          id: Number(lastVideo.id),
        };
      } else {
        nextCursor = {
          created_at: lastVideo.created_at,
          id: Number(lastVideo.id),
        };
      }
    }

    return NextResponse.json({ videos, nextCursor });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, category_id, game_title, stream_uid, platform } = body;
    
    // Validate and normalize platform if provided (must be one of allowed values)
    const allowedPlatforms = ['pc', 'xbox', 'playstation', 'switch', 'mobile', 'other'];
    let normalizedPlatform: string | null = null;
    if (platform !== null && platform !== undefined && platform !== '') {
      if (typeof platform !== 'string') {
        return NextResponse.json(
          { ok: false, error: 'Invalid platform value' },
          { status: 400 }
        );
      }
      const trimmedPlatform = platform.trim().toLowerCase();
      if (!allowedPlatforms.includes(trimmedPlatform)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid platform value' },
          { status: 400 }
        );
      }
      normalizedPlatform = trimmedPlatform;
    }

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid title' },
        { status: 400 }
      );
    }

    if (!stream_uid || typeof stream_uid !== 'string' || !stream_uid.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing stream_uid' },
        { status: 400 }
      );
    }

    // Insert video record with stream_uid
    const { data: videoData, error: insertError } = await supabase
      .from('videos')
      .insert({
        title: title.trim(),
        game_title: game_title?.trim() || null,
        category_id: category_id || null,
        created_by: user.id,
        stream_uid: stream_uid.trim(),
        playback_id: null, // Stream videos don't use playback_id
        platform: normalizedPlatform,
        vote_count: 0,
        hidden: false,
      })
      .select('id, stream_uid, title, created_at')
      .single();

    if (insertError) {
      console.error('[VIDEOS_POST] Insert error:', insertError);
      return NextResponse.json(
        { ok: false, error: 'Failed to create video' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      video: {
        id: videoData.id,
        stream_uid: videoData.stream_uid,
        title: videoData.title,
        created_at: videoData.created_at,
      },
    });
  } catch (error) {
    console.error('[VIDEOS_POST] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
