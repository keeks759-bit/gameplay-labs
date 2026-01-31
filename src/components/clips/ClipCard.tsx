/**
 * ClipCard Component
 * 
 * WHY: Reusable card component for displaying video clips
 * Shows title, category, vote count, and voting button
 * Uses useVote hook for secure RPC-based voting with optimistic updates
 * Displays video player when video_url is available
 * Uses public URLs for video playback (bucket is public)
 */

'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVote } from '@/hooks/useVote';
import { supabase } from '@/lib/supabaseClient';
import { VideoWithCategory } from '@/types/database';

type ClipCardProps = {
  video: VideoWithCategory;
};

const ADMIN_UUID = 'e570e7ed-d901-4af3-b1a1-77e57772a51c';

export default function ClipCard({ video }: ClipCardProps) {
  const router = useRouter();
  
  // Use voting hook - handles RPC call, vote checking, optimistic updates, and auth
  const { voteCount, hasVoted, isVoting, error, handleVote } = useVote(
    video.id,
    video.vote_count
  );

  // Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === ADMIN_UUID) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  /**
   * Extract storage path from video_url
   * Handles both formats:
   * - Full URL: https://...supabase.co/storage/v1/object/public/videos/userId/file.mov
   * - Storage path: userId/timestamp-file.mov
   */
  const extractStoragePath = (videoUrl: string): string | null => {
    if (!videoUrl) return null;

    // If it's already a storage path (no http/https), return as-is
    if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      return videoUrl;
    }

    // Extract path from full Supabase Storage URL
    // Pattern: .../storage/v1/object/public/videos/<path>
    const storageUrlPattern = /\/storage\/v1\/object\/public\/videos\/(.+)$/;
    const match = videoUrl.match(storageUrlPattern);

    if (match && match[1]) {
      // Decode URI component to handle encoded characters
      return decodeURIComponent(match[1]);
    }

    // Fallback: return as-is if we can't parse it
    return videoUrl;
  };

  // Generate public URL from storage path
  // WHY: Bucket is public, so we can generate URLs directly without API calls
  const publicVideoUrl = useMemo(() => {
    if (!video.video_url) return null;

    // Extract storage path from video_url (handles both full URL and path formats)
    const storagePath = extractStoragePath(video.video_url);

    if (!storagePath) {
      return null;
    }

    // Generate public URL using Supabase client
    const { data } = supabase.storage.from('videos').getPublicUrl(storagePath);
    return data.publicUrl || null;
  }, [video.video_url]);

  // Get stream_uid if present
  const streamUid = (video as any).stream_uid;
  
  // Stable base thumbnail URL for Stream videos (only depends on streamUid)
  // WHY: Prevents effect thrash from changing dependencies
  const baseThumbnailUrl = useMemo(() => {
    if (!streamUid) return null;
    return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?time=1s`;
  }, [streamUid]);
  
  // Determine thumbnail URL with priority: stream_thumbnail_url > Cloudflare Stream derived > thumbnail_url
  // WHY: Prefer Cloudflare Stream thumbnails when available for better quality/preview
  // NOTE: For Stream videos, baseThumbnailUrl is used in loader; this is for non-Stream fallback
  const thumbnailUrl = useMemo(() => {
    // Priority 1: Explicit stream thumbnail URL
    if ((video as any).stream_thumbnail_url) {
      return (video as any).stream_thumbnail_url;
    }
    
    // Priority 2: Derive Cloudflare Stream thumbnail from stream_uid
    if (streamUid) {
      return baseThumbnailUrl;
    }
    
    // Priority 3: Fallback to existing thumbnail_url
    return video.thumbnail_url || null;
  }, [video, streamUid, baseThumbnailUrl]);

  // Handle report submission
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportReason) {
      setReportError('Please select a reason');
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setReportError('Please log in to report content');
        setIsSubmittingReport(false);
        return;
      }

      // Insert report
      const { error: insertError } = await supabase
        .from('video_reports')
        .insert({
          video_id: video.id,
          reporter_id: user.id,
          reason: reportReason,
          details: reportDetails.trim() || null,
        });

      if (insertError) {
        // Check for unique violation (already reported)
        if (insertError.code === '23505') {
          setReportError('You already reported this video.');
        } else {
          setReportError(insertError.message || 'Failed to submit report');
        }
        setIsSubmittingReport(false);
        return;
      }

      // Success
      setReportSuccess(true);
      setShowReportForm(false);
      // Reset form after a delay
      setTimeout(() => {
        setReportSuccess(false);
        setReportReason('');
        setReportDetails('');
      }, 3000);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handle report button click
  const handleReportClick = async () => {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setReportError('Please log in to report content');
      return;
    }

    setShowReportForm(true);
    setReportError(null);
    setReportSuccess(false);
  };

  // Handle admin delete
  const handleAdminDelete = async () => {
    if (!isAdmin) return;

    const confirmed = window.confirm('Are you sure you want to delete this video? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_video', {
        p_video_id: Number(video.id),
      });

      if (rpcError) {
        console.error('Delete error:', rpcError);
        alert('Failed to delete video: ' + rpcError.message);
        setIsDeleting(false);
        return;
      }

      // Success - refresh page to remove deleted video from feed
      window.location.reload();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete video');
      setIsDeleting(false);
    }
  };

  // Track thumbnail loading state for Stream videos (feed tile only shows thumbnail)
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(null);
  
  // Ref to track last streamUid to prevent clearing state when effect re-runs for same video
  const lastStreamUidRef = useRef<string | null>(null);
  
  // Ref to track success per streamUid (prevents stale-closure issues)
  const didSucceedRef = useRef<Record<string, boolean>>({});
  
  // Minimum bytes to consider a thumbnail "real" (not a Cloudflare placeholder)
  // Cloudflare placeholder images are typically < 5KB, real thumbnails are usually > 10KB
  const MIN_BYTES = 5000;
  
  // Minimum average luminance to consider a thumbnail "real" (not a black placeholder)
  // Black placeholders have luminance < 20, real thumbnails are usually > 50
  const MIN_LUMINANCE = 20;
  
  // Helper: Check if blob image is a black placeholder by sampling luminance
  const checkImageLuminance = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      img.onload = () => {
        try {
          // Create tiny canvas for sampling (32x18 maintains 16:9 aspect)
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 18;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas context not available'));
            return;
          }
          
          // Draw image to canvas (scaled down)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Sample pixels and compute average luminance
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalLuminance = 0;
          let pixelCount = 0;
          
          // Sample every 4th pixel for performance (RGBA = 4 bytes per pixel)
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminance formula: 0.299*R + 0.587*G + 0.114*B
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += luminance;
            pixelCount++;
          }
          
          const avgLuminance = totalLuminance / pixelCount;
          
          // Cleanup object URL
          URL.revokeObjectURL(objectUrl);
          
          resolve(avgLuminance);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image load failed'));
      };
      
      img.src = objectUrl;
    });
  };
  
  // Auto-recovery: Retry thumbnail loading for Stream videos, validating blob size and luminance
  useEffect(() => {
    if (!streamUid || !baseThumbnailUrl) {
      setThumbnailLoading(false);
      setThumbnailObjectUrl(null);
      setThumbnailError(false);
      lastStreamUidRef.current = null;
      return;
    }
    
    // Only reset/clear state when streamUid actually changes (not on effect re-runs for same video)
    // This prevents flicker in dev strict mode, hydration, or other effect re-runs
    if (lastStreamUidRef.current !== streamUid) {
      lastStreamUidRef.current = streamUid;
      // Clear success flag for new streamUid
      didSucceedRef.current[streamUid] = false;
      setThumbnailObjectUrl(null);
      setThumbnailError(false);
      setThumbnailLoading(true);
    }
    
    // Early return: if thumbnail already succeeded for this streamUid, don't restart loading
    // Uses ref to avoid stale-closure issues
    if (didSucceedRef.current[streamUid] === true) {
      return;
    }
    
    const maxRetries = 15;
    const retryDelay = 2000; // 2 seconds
    let retries = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let currentObjectUrl: string | null = null;
    
    const attemptLoad = async () => {
      try {
        // Cache-bust each attempt to avoid CDN caching placeholder
        // Use baseThumbnailUrl (stable) instead of thumbnailUrl (may change)
        const cacheBustUrl = `${baseThumbnailUrl}${baseThumbnailUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
        
        // Fetch as blob to check size (placeholder images are small)
        const response = await fetch(cacheBustUrl, { cache: 'no-store' });
        
        if (!response.ok) {
          // HTTP error - retry
          retries++;
          if (retries < maxRetries) {
            timeoutId = setTimeout(attemptLoad, retryDelay);
          } else {
            setThumbnailLoading(false);
            setThumbnailError(true);
          }
          return;
        }
        
        const blob = await response.blob();
        const blobSize = blob.size;
        
        // First filter: size check
        if (blobSize < MIN_BYTES) {
          // Placeholder detected (too small) - retry
          retries++;
          if (retries < maxRetries) {
            timeoutId = setTimeout(attemptLoad, retryDelay);
          } else {
            // Max retries reached, show placeholder
            setThumbnailLoading(false);
            setThumbnailError(true);
          }
          return;
        }
        
        // Second filter: luminance check (detect black placeholders)
        try {
          const avgLuminance = await checkImageLuminance(blob);
          
          if (avgLuminance < MIN_LUMINANCE) {
            // Black placeholder detected (too dark) - retry
            retries++;
            if (retries < maxRetries) {
              timeoutId = setTimeout(attemptLoad, retryDelay);
            } else {
              // Max retries reached, show placeholder
              setThumbnailLoading(false);
              setThumbnailError(true);
            }
            return;
          }
          
          // Real thumbnail detected (size >= MIN_BYTES AND luminance >= MIN_LUMINANCE)
          // Revoke previous object URL if exists
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
          }
          
          // Create object URL for the validated blob
          const objectUrl = URL.createObjectURL(blob);
          currentObjectUrl = objectUrl;
          
          // Mark success for this streamUid (ref-based, no stale closure)
          didSucceedRef.current[streamUid] = true;
          
          setThumbnailObjectUrl(objectUrl);
          setThumbnailLoading(false);
          setThumbnailError(false);
        } catch (luminanceErr) {
          // Luminance check failed - treat as placeholder and retry
          retries++;
          if (retries < maxRetries) {
            timeoutId = setTimeout(attemptLoad, retryDelay);
          } else {
            setThumbnailLoading(false);
            setThumbnailError(true);
          }
        }
      } catch (err) {
        // Network error or fetch failure - retry
        retries++;
        if (retries < maxRetries) {
          timeoutId = setTimeout(attemptLoad, retryDelay);
        } else {
          setThumbnailLoading(false);
          setThumbnailError(true);
        }
      }
    };
    
    // Start first attempt
    attemptLoad();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Cleanup: revoke object URL on unmount or dependency change
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [streamUid, baseThumbnailUrl]);
  
  // Handle tile click - navigate to player page
  const handleTileClick = () => {
    router.push(`/clips/${video.id}`);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/50 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-900">
      {/* Video or Thumbnail */}
      <div className="bg-zinc-100 dark:bg-zinc-800">
        {streamUid ? (
          // Cloudflare Stream: Feed tile shows thumbnail only (no iframe)
          // ENFORCED: NEVER render raw thumbnailUrl for Stream videos - only use thumbnailObjectUrl
          <div 
            className="aspect-video w-full overflow-hidden rounded-t-2xl relative bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer group"
            onClick={handleTileClick}
          >
            {/* Thumbnail image - ONLY render when thumbnailObjectUrl exists (validated blob) */}
            {thumbnailObjectUrl && !thumbnailError && !thumbnailLoading ? (
              <img
                src={thumbnailObjectUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              // Processing placeholder - shown when thumbnailObjectUrl is not available
              // (loading, error, or placeholder detected)
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {thumbnailLoading ? (
                    <>
                      <div className="w-12 h-12 mx-auto mb-2 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-400 rounded-full animate-spin" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">Loading…</p>
                    </>
                  ) : (
                    <>
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
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">Processing…</p>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-[2px] rounded-full p-3 md:p-4 group-hover:bg-black/50 transition-colors">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : video.video_url ? (
          // Supabase Storage video: Feed tile shows thumbnail only (no video player)
          <div 
            className="aspect-video w-full overflow-hidden rounded-t-2xl relative bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer group"
            onClick={handleTileClick}
          >
            {/* Thumbnail or placeholder */}
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
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
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">Tap to play</p>
                </div>
              </div>
            )}
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-[2px] rounded-full p-3 md:p-4 group-hover:bg-black/50 transition-colors">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : thumbnailUrl ? (
          // Fallback to thumbnail if no video_url
          <div 
            className="aspect-video relative cursor-pointer group overflow-hidden rounded-t-2xl"
            onClick={handleTileClick}
          >
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-[2px] rounded-full p-3 md:p-4 group-hover:bg-black/50 transition-colors">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          // Show neutral placeholder if no video_url or thumbnail
          <div 
            className="aspect-video flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer group"
            onClick={handleTileClick}
          >
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
              <p className="text-xs text-zinc-500 dark:text-zinc-500">No preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {video.game_title && video.game_title.trim() && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
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
        <div className="mb-3">
          <h3 className="font-semibold text-base md:text-lg text-zinc-900 dark:text-zinc-50 line-clamp-2 leading-snug">
            {video.title}
          </h3>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-xs md:text-sm pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-500">
            {video.categories?.name || 'Uncategorized'}
          </span>
          <div className="flex items-center gap-2 md:gap-2.5">
            {/* Vote button - disabled if already voted or voting in progress */}
            <button
              onClick={handleVote}
              disabled={hasVoted || isVoting}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 md:px-3 md:py-1.5 transition-all touch-manipulation ${
                hasVoted
                  ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
              title={hasVoted ? 'You have already voted' : 'Vote for this clip'}
            >
              <svg
                className="h-4 w-4 md:h-4 md:w-4"
                fill={hasVoted ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span className="font-medium">{voteCount}</span>
            </button>
            
            {/* Report button */}
            <button
              onClick={handleReportClick}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              title="Report this video"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </button>

            {/* Admin delete button */}
            {isAdmin && (
              <button
                onClick={handleAdminDelete}
                disabled={isDeleting}
                className="text-xs text-red-500/70 hover:text-red-600 dark:text-red-400/70 dark:hover:text-red-400 transition-colors disabled:opacity-50 ml-1"
                title="Delete this video (admin only)"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* Report Form */}
        {showReportForm && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            {reportSuccess ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                Report submitted. Thank you for helping keep the community safe.
              </p>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div>
                  <label htmlFor={`report-reason-${video.id}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`report-reason-${video.id}`}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    required
                    disabled={isSubmittingReport}
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    <option value="">Select a reason</option>
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="nudity">Nudity</option>
                    <option value="copyright">Copyright</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`report-details-${video.id}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Additional Details (optional)
                  </label>
                  <textarea
                    id={`report-details-${video.id}`}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={2}
                    disabled={isSubmittingReport}
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="Provide any additional context..."
                  />
                </div>
                {reportError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{reportError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReport || !reportReason}
                    className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportForm(false);
                      setReportError(null);
                      setReportReason('');
                      setReportDetails('');
                    }}
                    disabled={isSubmittingReport}
                    className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
