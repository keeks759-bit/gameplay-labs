'use client';

import { useEffect, useState } from 'react';
import ClipGrid from '@/components/clips/ClipGrid';
import { VideoWithCategory } from '@/types/database';

export default function TopPage() {
  const [videos, setVideos] = useState<VideoWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopVideos() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/videos?sort=votes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }

        const data = await response.json();
        setVideos(data.videos || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load top clips. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTopVideos();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Top Plays
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          The most popular gaming highlights ranked by community votes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <ClipGrid videos={videos} isLoading={isLoading} />
    </div>
  );
}
