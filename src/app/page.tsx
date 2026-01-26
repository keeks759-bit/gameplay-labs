'use client';

import { Suspense } from 'react';
import VideoFeed from '@/components/VideoFeed';
import ClipGrid from '@/components/clips/ClipGrid';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 md:space-y-8">
        <div className="rounded-3xl border border-zinc-200/50 bg-white/50 backdrop-blur-sm p-6 md:p-8 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/50">
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gaming Highlights
            </h1>
            <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Discover and vote on the best gaming moments from the community.
            </p>
          </div>
        </div>
        <ClipGrid videos={[]} isLoading={true} />
      </div>
    }>
      <VideoFeed defaultSort="newest" />
    </Suspense>
  );
}
