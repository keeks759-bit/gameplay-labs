/**
 * API Route: GET /api/videos
 * 
 * WHY: Server-side data fetching for videos
 * Fetches videos with categories, sorted by vote_count and created_at
 * Only shows videos with status='active'
 */

import { NextResponse } from 'next/server';
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

    // Build query
    let query = supabase
      .from('videos')
      .select(`
        *,
        categories:categories!category_id (*)
      `)
      .eq('hidden', false);

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
    const videos: VideoWithCategory[] = (data || []).map((video: any) => ({
      ...video,
      categories: video.categories || null,
    }));

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
