/**
 * ClipGrid Component
 * 
 * WHY: Displays videos in a responsive grid layout
 * Handles loading and empty states
 */

import ClipCard from './ClipCard';
import { VideoWithCategory } from '@/types/database';

type ClipGridProps = {
  videos: VideoWithCategory[];
  isLoading?: boolean;
};

export default function ClipGrid({ videos, isLoading }: ClipGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm animate-pulse dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-zinc-200 rounded dark:bg-zinc-800" />
              <div className="h-3 bg-zinc-200 rounded w-2/3 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 rounded-full bg-zinc-100 p-4 inline-block dark:bg-zinc-800">
          <svg
            className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          No clips found
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Check back later for new gaming highlights
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <ClipCard key={video.id} video={video} />
      ))}
    </div>
  );
}
