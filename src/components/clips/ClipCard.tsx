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

import { useMemo, useState } from 'react';
import { useVote } from '@/hooks/useVote';
import { supabase } from '@/lib/supabaseClient';
import { VideoWithCategory } from '@/types/database';

type ClipCardProps = {
  video: VideoWithCategory;
};

export default function ClipCard({ video }: ClipCardProps) {
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

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Video or Thumbnail */}
      <div className="bg-zinc-100 dark:bg-zinc-800">
        {video.video_url ? (
          // Show video player if video_url exists (using public URL)
          <div>
            {publicVideoUrl ? (
              <>
                <video
                  src={publicVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="px-4 py-2">
                  <a
                    href={publicVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Open file
                  </a>
                </div>
              </>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <p className="text-sm text-red-500 dark:text-red-400">Failed to load video</p>
              </div>
            )}
          </div>
        ) : video.thumbnail_url ? (
          // Fallback to thumbnail if no video_url
          <div className="aspect-video">
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          // Show "No video attached" if no video_url
          <div className="aspect-video flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No video attached</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
            {video.title}
          </h3>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {video.categories?.name || 'Uncategorized'}
          </span>
          <div className="flex items-center gap-2">
            {/* Vote button - disabled if already voted or voting in progress */}
            <button
              onClick={handleVote}
              disabled={hasVoted || isVoting}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                hasVoted
                  ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={hasVoted ? 'You have already voted' : 'Vote for this clip'}
            >
              <svg
                className="h-4 w-4"
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
