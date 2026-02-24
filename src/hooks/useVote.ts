/**
 * useVote Hook
 * 
 * WHY: Centralizes voting logic with RPC call, vote checking, and optimistic updates
 * Prevents duplicate votes in UI and handles authentication
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UseVoteResult = {
  voteCount: number;
  hasVoted: boolean;
  isVoting: boolean;
  error: string | null;
  handleVote: () => Promise<void>;
};

export function useVote(
  videoId: string | number,
  initialVoteCount: number
): UseVoteResult {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert videoId to number safely
  // WHY: RPC function expects bigint, so we need numeric value
  const numericVideoId = Number(videoId);

  // Validate numericVideoId is a valid number
  // WHY: Ensure we don't call RPC with invalid data
  const isValidNumericId = Number.isFinite(numericVideoId) && numericVideoId > 0;

  // Check if user has already voted for this video
  useEffect(() => {
    const checkVote = async () => {
      // Validate ID inside effect to avoid external dependencies
      const isValid = Number.isFinite(numericVideoId) && numericVideoId > 0;
      
      // Skip vote check if ID is invalid
      if (!isValid) {
        setHasVoted(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasVoted(false);
        return;
      }

      // Check if vote exists in votes table
      // WHY: Prevent showing vote button as enabled if user already voted
      // Note: votes table uses numeric video_id matching the RPC parameter
      const { data, error: voteError } = await supabase
        .from('votes')
        .select('id')
        .eq('video_id', numericVideoId) // Use numeric ID for query
        .eq('user_id', user.id)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') {
        // Real error (not just "no rows")
        console.error('Error checking vote:', voteError);
        return;
      }

      setHasVoted(!!data);
    };

    checkVote();
  }, [numericVideoId]);

  const handleVote = async () => {
    // Validate video ID before proceeding
    if (!isValidNumericId) {
      setError('Invalid video ID');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Redirect unauthenticated users to login using hard navigation
      // WHY: Ensures we leave current page and prevents redirect loops
      window.location.href = '/login?redirect=/';
      return;
    }

    setIsVoting(true);
    setError(null);

    // Optimistically update vote count
    // WHY: Immediate UI feedback improves perceived performance
    const previousCount = voteCount;
    const previousHasVoted = hasVoted;

    try {
      if (hasVoted) {
        // User has already voted - unvote (DELETE)
        // Optimistically decrement vote count
        // Note: Actual decrement amount depends on user's weight (handled by DB trigger)
        setVoteCount(Math.max(0, voteCount - 1)); // Conservative estimate (actual may be 33/21/17)
        setHasVoted(false);

        const response = await fetch('/api/votes', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: numericVideoId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Failed to unvote';
          
          // Rollback optimistic update on error
          setVoteCount(previousCount);
          setHasVoted(previousHasVoted);
          
          throw new Error(errorMessage);
        }

        // Success - refresh vote count from server to get accurate weighted value
        // Note: We don't know the exact weight client-side, so we'll rely on the UI
        // to refresh from the video data, or we could fetch it here
      } else {
        // User has not voted - vote (POST)
        // Optimistically increment vote count
        // Note: Actual increment amount depends on user's weight (handled by DB trigger)
        setVoteCount(voteCount + 1); // Conservative estimate (actual may be 33/21/17)
        setHasVoted(true);

        // Call API route to cast vote
        // WHY: API route wraps RPC cast_vote and returns proper HTTP status codes (429 for daily limit)
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: numericVideoId, // Must be numeric (bigint)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Failed to vote';
          
          // Rollback optimistic update on error
          setVoteCount(previousCount);
          setHasVoted(previousHasVoted);
          
          // Handle daily vote limit (429)
          if (response.status === 429 && errorMessage === 'Daily vote limit reached') {
            throw new Error('Daily vote limit reached');
          }
          
          throw new Error(errorMessage);
        }

        // Success - optimistic update was correct
        // Note: Actual vote_count may be higher if user has weight > 1
      }
    } catch (err: any) {
      // Rollback optimistic update
      setVoteCount(previousCount);
      setHasVoted(previousHasVoted);
      setError(err.message || 'Failed to vote. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsVoting(false);
    }
  };

  return {
    voteCount,
    hasVoted,
    isVoting,
    error,
    handleVote,
  };
}
