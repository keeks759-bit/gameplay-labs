'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { VideoWithCategory } from '@/types/database';

// Extended type for videos with platform field
type VideoWithCategoryAndPlatform = VideoWithCategory & {
  platform?: string | null;
};

const PLATFORM_OPTIONS = ['PC', 'PlayStation', 'Xbox', 'Switch'];
const GENRE_OPTIONS = ['FPS', 'RPG', 'Sports', 'Fighting', 'Racing', 'Strategy'];
const REGION_OPTIONS = ['NA-East', 'NA-West', 'EU', 'LATAM', 'APAC'];
const PLAYSTYLE_OPTIONS = ['Casual', 'Competitive', 'Creator'];

export default function ProfilePage() {
  const supabase = createBrowserSupabaseClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  
  // My uploads state
  const [uploads, setUploads] = useState<VideoWithCategoryAndPlatform[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [primaryGames, setPrimaryGames] = useState('');
  const [region, setRegion] = useState('');
  const [playstyle, setPlaystyle] = useState('');

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setUser(null);
      } else {
        setUser(user);
        // Fetch profile if user exists
        fetchProfile(user.id);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No rows - profile doesn't exist, that's fine
          setProfileExists(false);
        } else {
          // Real error
          setError(profileError.message || 'Failed to load profile. The profiles table may be missing or RLS is blocking access.');
          setLoading(false);
          return;
        }
      }

      if (data) {
        // Profile exists - populate form
        setProfileExists(true);
        setDisplayName(data.display_name || '');
        setPlatforms(data.platforms || []);
        setFavoriteGenres(data.favorite_genres || []);
        setPrimaryGames(data.primary_games || '');
        setRegion(data.region || '');
        setPlaystyle(data.playstyle || '');
      } else {
        // No profile - form will be empty (ready for creation)
        setProfileExists(false);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load profile. The profiles table may be missing or RLS is blocking access.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's uploads
  const fetchUploads = async (userId: string) => {
    setUploadsLoading(true);
    setUploadsError(null);
    
    try {
      const { data, error: uploadsError } = await supabase
        .from('videos')
        .select(`
          *,
          categories:categories!category_id (*)
        `)
        .eq('created_by', userId)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (uploadsError) {
        setUploadsError('Couldn\'t load your uploads. Please try again.');
        setUploads([]);
        return;
      }
      
      const videosWithCategories: VideoWithCategoryAndPlatform[] = (data || []).map((video: any) => ({
        ...video,
        categories: video.categories || null,
        platform: video.platform || null,
      }));
      
      setUploads(videosWithCategories);
    } catch (err: any) {
      setUploadsError('Couldn\'t load your uploads. Please try again.');
      setUploads([]);
    } finally {
      setUploadsLoading(false);
    }
  };

  // Fetch uploads when user is available
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId) {
      fetchUploads(userId);
    }
  }, [userId]);

  const handleCheckboxChange = (
    value: string,
    current: string[],
    setter: (value: string[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const profileData = {
        id: user.id,
        display_name: displayName,
        platforms,
        favorite_genres: favoriteGenres,
        primary_games: primaryGames || null,
        region: region || null,
        playstyle: playstyle || null,
      };

      let result;
      if (profileExists) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
          .select()
          .single();
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setProfileExists(true);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  // If no user, show login prompt
  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              You're not logged in
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Please log in to access your profile.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render profile form
  return (
    <div className="space-y-8">
      {/* Debug line (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          User: {user.id.substring(0, 8)}... | Path: /profile
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your Profile
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          {profileExists ? 'Update your profile information and preferences.' : 'Set up your profile to get started.'}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">
              Profile saved successfully!
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="display_name" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={saving}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="Your display name"
            />
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Platforms <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {PLATFORM_OPTIONS.map((platform) => (
                <label key={platform} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={() => handleCheckboxChange(platform, platforms, setPlatforms)}
                    disabled={saving}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Favorite Genres */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Favorite Genres
            </label>
            <div className="space-y-2">
              {GENRE_OPTIONS.map((genre) => (
                <label key={genre} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={favoriteGenres.includes(genre)}
                    onChange={() => handleCheckboxChange(genre, favoriteGenres, setFavoriteGenres)}
                    disabled={saving}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{genre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Primary Games */}
          <div className="space-y-2">
            <label htmlFor="primary_games" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Primary Games
            </label>
            <input
              type="text"
              id="primary_games"
              value={primaryGames}
              onChange={(e) => setPrimaryGames(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="e.g., Valorant, CS2, Fortnite"
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <label htmlFor="region" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            >
              <option value="">Select a region</option>
              {REGION_OPTIONS.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Playstyle */}
          <div className="space-y-2">
            <label htmlFor="playstyle" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Playstyle
            </label>
            <select
              id="playstyle"
              value={playstyle}
              onChange={(e) => setPlaystyle(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            >
              <option value="">Select a playstyle</option>
              {PLAYSTYLE_OPTIONS.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !displayName || platforms.length === 0}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {saving ? 'Saving...' : profileExists ? 'Update Profile' : 'Create Profile'}
          </button>
        </form>
      </div>

      {/* My uploads section */}
      {user && (
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              My uploads
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
              Clips you've uploaded
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {uploadsLoading && (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Loading your uploads...
              </p>
            )}

            {uploadsError && !uploadsLoading && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {uploadsError}
              </p>
            )}

            {!uploadsLoading && !uploadsError && uploads.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                No uploads yet.
              </p>
            )}

            {!uploadsLoading && !uploadsError && uploads.length > 0 && (
              <div className="space-y-3">
                {uploads.map((video) => (
                  <Link
                    key={video.id}
                    href={`/clips/${video.id}`}
                    className="block rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50 line-clamp-2 mb-1">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-500">
                          {video.categories?.name && (
                            <span>{video.categories.name}</span>
                          )}
                          {video.categories?.name && <span>•</span>}
                          <span>{video.vote_count} {video.vote_count === 1 ? 'vote' : 'votes'}</span>
                          <span>•</span>
                          <span>{new Date(video.created_at).toLocaleDateString()}</span>
                          {video.platform && video.platform.trim() && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                {video.platform === 'pc' ? 'PC' :
                                 video.platform === 'xbox' ? 'Xbox' :
                                 video.platform === 'playstation' ? 'PlayStation' :
                                 video.platform === 'switch' ? 'Switch' :
                                 video.platform === 'mobile' ? 'Mobile' :
                                 video.platform === 'other' ? 'Other' :
                                 video.platform}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
