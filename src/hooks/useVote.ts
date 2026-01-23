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

    // Prevent double voting
    if (hasVoted) {
      setError('You have already voted for this clip');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsVoting(true);
    setError(null);

    // Optimistically update vote count
    // WHY: Immediate UI feedback improves perceived performance
    const previousCount = voteCount;
    setVoteCount(voteCount + 1);
    setHasVoted(true);

    try {
      // Call RPC function to cast vote
      // WHY: RPC function cast_vote(p_video_id bigint) increments vote_count and handles duplicate prevention
      const { error: rpcError } = await supabase.rpc('cast_vote', {
        p_video_id: numericVideoId, // Must be numeric (bigint)
      });

      if (rpcError) {
        // Rollback optimistic update on error
        setVoteCount(previousCount);
        setHasVoted(false);
        throw rpcError;
      }

      // Success - optimistic update was correct
    } catch (err: any) {
      // Rollback optimistic update
      setVoteCount(previousCount);
      setHasVoted(false);
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
