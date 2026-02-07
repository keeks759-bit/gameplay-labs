'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ClipGrid from '@/components/clips/ClipGrid';
import { VideoWithCategory } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';

type VotesCursor = {
  vote_count: number;
  created_at: string;
  id: number;
};

type NewestCursor = {
  created_at: string;
  id: number;
};

type Category = {
  id: number;
  name: string;
};

type VideoFeedProps = {
  defaultSort: 'votes' | 'newest';
};

export default function VideoFeed({ defaultSort }: VideoFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<VideoWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<VotesCursor | NewestCursor | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Filter/Sort state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const currentSort = searchParams.get('sort') || defaultSort;
  const currentCategoryId = searchParams.get('category_id');

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name')
          .order('id', { ascending: true });

        if (fetchError) throw new Error(fetchError.message || 'Failed to load categories');

        if (data) {
          const categoriesList: Category[] = data.map((cat) => ({
            id: Number(cat.id),
            name: cat.name,
          }));
          setCategories(categoriesList);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Fetch videos when sort/category changes
  useEffect(() => {
    async function fetchVideos() {
      try {
        setIsLoading(true);
        setNextCursor(null); // Reset cursor when filter/sort changes
        
        const params = new URLSearchParams();
        params.set('sort', currentSort);
        params.set('limit', '12');
        if (currentCategoryId) {
          params.set('category_id', currentCategoryId);
        }

        const response = await fetch(`/api/videos?${params.toString()}`);
        
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
  }, [currentSort, currentCategoryId]);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    try {
      setIsLoadingMore(true);

      const params = new URLSearchParams();
      params.set('sort', currentSort);
      params.set('limit', '12');
      if (currentCategoryId) {
        params.set('category_id', currentCategoryId);
      }

      // Composite cursor for sort=votes
      const cursor = nextCursor as VotesCursor;
      if (currentSort === 'votes' && typeof cursor.vote_count === 'number') {
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

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    if (currentCategoryId) {
      params.set('category_id', currentCategoryId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', currentSort);
    if (categoryId && categoryId !== 'all') {
      params.set('category_id', categoryId);
    } else {
      params.delete('category_id');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="rounded-3xl border border-zinc-200/50 bg-white/50 backdrop-blur-sm p-6 md:p-8 lg:p-10 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            Create a free profile to share your best gameplay moments, watch what others are pulling off, and vote on the clips that stand out.
          </h1>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Discover the top play moments, ranked by the community.
          </p>
        </div>
      </div>

      {/* Filter + Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <label htmlFor="sort" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            Sort:
          </label>
          <select
            id="sort"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
          >
            <option value="votes">Top (Votes)</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <label htmlFor="category" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            Category:
          </label>
          <select
            id="category"
            value={currentCategoryId || 'all'}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={loadingCategories}
            className="flex-1 sm:flex-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200/50 bg-red-50/80 p-4 shadow-sm dark:border-red-800/50 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <ClipGrid videos={videos} isLoading={isLoading} />

      {/* Load more */}
      {!isLoading && (nextCursor !== null) && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-full border border-zinc-200/50 bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 transition-all hover:bg-zinc-50 hover:shadow-sm disabled:opacity-50 dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
