'use client';

import { useEffect, useState } from 'react';
import ClipGrid from '@/components/clips/ClipGrid';
import { VideoWithCategory } from '@/types/database';

type VotesCursor = {
  vote_count: number;
  created_at: string;
  id: number;
};

type NewestCursor = {
  created_at: string;
  id: number;
};

export default function HomePage() {
  const [videos, setVideos] = useState<VideoWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<VotesCursor | NewestCursor | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/videos?sort=votes&limit=12');
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }

        const data = await response.json();
        setVideos(data.videos || []);
        setNextCursor(data.nextCursor ?? null);
        setError(null);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load clips. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, []);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    try {
      setIsLoadingMore(true);

      const params = new URLSearchParams();
      params.set('sort', 'votes');
      params.set('limit', '12');

      // Composite cursor for sort=votes
      const cursor = nextCursor as VotesCursor;
      if (typeof cursor.vote_count === 'number') {
        params.set('cursor_vote_count', String(cursor.vote_count));
      }
      params.set('cursor_created_at', cursor.created_at);
      params.set('cursor_id', String(cursor.id));

      const url = `/api/videos?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      const newVideos: VideoWithCategory[] = data.videos || [];
      const newNextCursor = data.nextCursor ?? null;

      // Append and dedupe by id
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const merged = [...prev];
        for (const v of newVideos) {
          if (!seen.has(v.id)) {
            merged.push(v);
            seen.add(v.id);
          }
        }
        return merged;
      });

      setNextCursor(newNextCursor);
    } catch (err) {
      console.error('Error fetching more videos:', err);
      setError('Failed to load more clips. Please try again later.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 md:space-y-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create a free profile to share your best game clips, view others' highlights, and vote on your favorites
        </h1>
        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed md:leading-normal px-2 md:px-0">
          Browse the latest gaming highlights ranked by community votes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <ClipGrid videos={videos} isLoading={isLoading} />

      {/* Load more */}
      {!isLoading && (nextCursor !== null) && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
