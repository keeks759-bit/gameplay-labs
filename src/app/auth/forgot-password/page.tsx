'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { getSiteUrl } from '@/lib/siteUrl';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isSubmittingRef = useRef(false);
  const supabase = createBrowserSupabaseClient();

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Single-flight protection
    if (isSubmittingRef.current || loading || cooldownSeconds > 0) {
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    // Dev-only logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('AUTH_EMAIL_SEND: reset');
    }

    try {
      const siteUrl = getSiteUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });

      if (resetError) {
        // Check for rate limit errors
        const errorMsg = (resetError.message || '').toLowerCase();
        const isRateLimit = 
          errorMsg.includes('rate limit') ||
          errorMsg.includes('over_email_send_rate_limit') ||
          errorMsg.includes('email rate limit exceeded') ||
          errorMsg.includes('too many');

        if (isRateLimit) {
          setError('Too many emails sent recently. Please wait a bit and try again.');
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        
        // Show detailed error message including error text
        const errorDetails = [];
        if (resetError.message) {
          errorDetails.push(resetError.message);
        }
        if (resetError.status) {
          errorDetails.push(`Status: ${resetError.status}`);
        }
        if (resetError.code) {
          errorDetails.push(`Code: ${resetError.code}`);
        }
        
        const fullErrorMsg = errorDetails.length > 0 
          ? errorDetails.join(' | ')
          : 'Failed to send reset email. Please try again.';
        
        setError(fullErrorMsg);
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Show success message
      setMessage('If an account exists for that email, you\'ll receive a reset email shortly.');
      setError(null);
      setEmail('');
      
      // Start 60-second cooldown
      setCooldownSeconds(60);
    } catch (error: any) {
      // Fallback error handling
      const errorMsg = error?.message || 'An error occurred. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reset Password
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {message && (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                If the link doesn't work, use the reset code from the email.
              </p>
              <Link
                href="/auth/reset-password"
                className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Enter reset code
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldownSeconds > 0}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {loading 
              ? 'Sending...' 
              : cooldownSeconds > 0 
                ? `Please wait ${cooldownSeconds}s before requesting another reset link`
                : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
