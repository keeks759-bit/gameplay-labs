'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { VideoWithCategory } from '@/types/database';

export default function ClipPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const [video, setVideo] = useState<VideoWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPlatform, setAdminPlatform] = useState<string>('');
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);
  
  // Stream processing state
  const streamUid = (video as any)?.stream_uid;
  const [streamProcessing, setStreamProcessing] = useState(!!streamUid);
  const [streamReady, setStreamReady] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  
  // Determine thumbnail URL
  const thumbnailUrl = useMemo(() => {
    if (!video) return null;
    if ((video as any).stream_thumbnail_url) {
      return (video as any).stream_thumbnail_url;
    }
    if ((video as any).stream_uid) {
      return `https://videodelivery.net/${(video as any).stream_uid}/thumbnails/thumbnail.jpg?time=1s`;
    }
    return video.thumbnail_url || null;
  }, [video]);
  
  // Extract storage path for Supabase videos
  const extractStoragePath = (videoUrl: string): string | null => {
    if (!videoUrl) return null;
    if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      return videoUrl;
    }
    const storageUrlPattern = /\/storage\/v1\/object\/public\/videos\/(.+)$/;
    const match = videoUrl.match(storageUrlPattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return videoUrl;
  };
  
  const publicVideoUrl = useMemo(() => {
    if (!video?.video_url) return null;
    const storagePath = extractStoragePath(video.video_url);
    if (!storagePath) return null;
    const { data } = supabase.storage.from('videos').getPublicUrl(storagePath);
    return data.publicUrl || null;
  }, [video?.video_url]);
  
  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === 'e570e7ed-d901-4af3-b1a1-77e57772a51c') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);
  
  // Fetch video data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('videos')
          .select(`
            *,
            categories:video_categories_v1!category_id (*)
          `)
          .eq('id', videoId)
          .eq('hidden', false)
          .single();
        
        if (fetchError) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        
        setVideo(data as VideoWithCategory);
        setAdminPlatform((data as any).platform || '');
        setLoading(false);
      } catch (err) {
        setError('Failed to load video');
        setLoading(false);
      }
    };
    
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);
  
  // Handle admin platform update
  const handleAdminPlatformSave = async () => {
    if (!isAdmin || !video) return;
    
    setIsSavingPlatform(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_update_video_platform', {
        p_video_id: Number(video.id),
        p_platform: adminPlatform.trim() || null,
      });
      
      if (rpcError) {
        console.error('Platform update error:', rpcError);
        alert('Failed to update platform: ' + rpcError.message);
        setIsSavingPlatform(false);
        return;
      }
      
      // Update local state
      setVideo({ ...video, platform: adminPlatform.trim() || null } as VideoWithCategory);
      alert('Platform updated successfully');
    } catch (err) {
      console.error('Platform update error:', err);
      alert('Failed to update platform');
    } finally {
      setIsSavingPlatform(false);
    }
  };
  
  // Retry logic for Stream video availability (max 30 seconds, 15 retries)
  useEffect(() => {
    if (!streamUid) return;
    
    const startTime = Date.now();
    const maxProcessingTime = 30000; // 30 seconds
    const maxRetries = 15;
    let retries = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const checkStreamReady = () => {
      const elapsed = Date.now() - startTime;
      
      // Check if we've exceeded max time or retries
      if (elapsed >= maxProcessingTime || retries >= maxRetries) {
        setShowFallback(true);
        setStreamProcessing(true);
        return;
      }
      
      // Check if thumbnail is available (indicates video is processing/ready)
      if (thumbnailUrl) {
        const img = new Image();
        img.onload = () => {
          // Thumbnail loaded - video is likely ready, show iframe
          setStreamReady(true);
          setStreamProcessing(false);
        };
        img.onerror = () => {
          // Thumbnail not ready yet, retry
          retries++;
          const currentElapsed = Date.now() - startTime;
          if (retries < maxRetries && currentElapsed < maxProcessingTime) {
            timeoutId = setTimeout(checkStreamReady, 2000);
          } else {
            // After max time/retries, still show iframe but keep processing overlay
            setStreamReady(true);
            setShowFallback(true);
            setStreamProcessing(true);
          }
        };
        img.src = thumbnailUrl;
      } else {
        // No thumbnail URL yet, retry after delay
        retries++;
        const currentElapsed = Date.now() - startTime;
        if (retries < maxRetries && currentElapsed < maxProcessingTime) {
          timeoutId = setTimeout(checkStreamReady, 2000);
        } else {
          // After max time/retries, show iframe anyway but keep processing overlay
          setStreamReady(true);
          setShowFallback(true);
          setStreamProcessing(true);
        }
      }
    };
    
    // Start checking after initial delay
    timeoutId = setTimeout(checkStreamReady, 1000);
    
    // Set max timeout to show fallback after 30 seconds
    const maxTimeout = setTimeout(() => {
      if (!streamReady) {
        setShowFallback(true);
        setStreamProcessing(true);
      }
    }, maxProcessingTime);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(maxTimeout);
    };
  }, [streamUid, thumbnailUrl, streamReady]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading video...</p>
        </div>
      </div>
    );
  }
  
  if (error || !video) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-zinc-900 dark:text-zinc-50 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        {/* Video player */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="aspect-video w-full relative bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900">
            {streamUid ? (
              // Cloudflare Stream iframe player
              <>
                {/* Thumbnail preview - shows before iframe loads */}
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    loading="lazy"
                  />
                )}
                {/* Cloudflare Stream iframe player - only render when ready */}
                {streamReady && (
                  <iframe
                    src={`https://iframe.videodelivery.net/${streamUid}`}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                    className="w-full h-full relative z-10"
                    style={{ border: 'none' }}
                    onLoad={() => {
                      // Iframe loaded - video is ready
                      setStreamReady(true);
                      setStreamProcessing(false);
                    }}
                  />
                )}
                {/* Processing overlay - fully opaque to hide any underlying errors */}
                {streamProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-900 z-30 pointer-events-none">
                    <div className="text-center bg-white dark:bg-zinc-900 rounded-lg px-4 py-2">
                      {showFallback ? (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Still processing. Please refresh in a moment.
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Processing video... this can take a few seconds
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : publicVideoUrl ? (
              // Supabase Storage video player
              <video
                src={publicVideoUrl}
                controls
                playsInline
                preload="auto"
                poster={thumbnailUrl || undefined}
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              // No video available
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-2"
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
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">Video not available</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Video info */}
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {video.game_title && video.game_title.trim() && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  {video.game_title}
                </p>
              )}
              {(video as any).platform && (video as any).platform.trim() && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {(video as any).platform === 'pc' ? 'PC' :
                   (video as any).platform === 'xbox' ? 'Xbox' :
                   (video as any).platform === 'playstation' ? 'PlayStation' :
                   (video as any).platform === 'switch' ? 'Switch' :
                   (video as any).platform === 'mobile' ? 'Mobile' :
                   (video as any).platform === 'other' ? 'Other' :
                   (video as any).platform}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {video.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500 mb-4">
              <span>{video.categories?.name || 'Uncategorized'}</span>
              <span>•</span>
              <span>{new Date(video.created_at).toLocaleDateString()}</span>
            </div>
            
            {/* Admin-only platform edit */}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Platform (Admin)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={adminPlatform}
                    onChange={(e) => setAdminPlatform(e.target.value)}
                    disabled={isSavingPlatform}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  >
                    <option value="">Not selected</option>
                    <option value="pc">PC</option>
                    <option value="xbox">Xbox</option>
                    <option value="playstation">PlayStation</option>
                    <option value="switch">Switch</option>
                    <option value="mobile">Mobile</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={handleAdminPlatformSave}
                    disabled={isSavingPlatform}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {isSavingPlatform ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
