'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { validatePassword } from '@/lib/passwordValidation';

function ResetPasswordContent() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validation, setValidation] = useState<ReturnType<typeof validatePassword>>({
    isValid: false,
    errors: [],
    hints: [],
  });

  // Check if user has a valid session from recovery link
  // IMPORTANT: This page MUST NOT redirect away - it's the destination for password reset
  // Session should already be established by /auth/confirm route (token_hash flow)
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Retry getting session with small delays (cookies may need time to sync after redirect)
        let retries = 0;
        const maxRetries = 3;
        let session = null;
        
        while (retries < maxRetries && !session) {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
          }
          
          if (currentSession) {
            session = currentSession;
            break;
          }
          
          // Wait a bit before retrying (cookies may need time to sync)
          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retries++;
        }
        
        if (!session) {
          setError('Invalid or expired reset link. Please request a new password reset.');
          setCheckingSession(false);
          return;
        }

        // Session exists - this is correct for password reset flow
        // DO NOT redirect away - user needs to set new password here
        setCheckingSession(false);
      } catch (err) {
        console.error('Session check error:', err);
        setError('Failed to verify reset link. Please try again.');
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  // Check for error from callback route
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setCheckingSession(false);
      // Clear error from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Validate password as user types
  useEffect(() => {
    if (password) {
      setValidation(validatePassword(password));
    } else {
      setValidation({ isValid: false, errors: [], hints: [] });
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    if (!validation.isValid) {
      setError('Please fix the password requirements above.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Verify session exists before updating password
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Auth session missing! Please use the reset link from your email.');
      }
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="mx-auto max-w-md space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">
              Password reset successfully! Redirecting to login...
            </p>
          </div>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
              Click here if you're not redirected
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set New Password
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Enter your new password below.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={12}
              className={`w-full rounded-lg border px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 ${
                password && !validation.isValid
                  ? 'border-red-300 bg-white focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-600 dark:focus:ring-red-600'
                  : 'border-zinc-300 bg-white focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-600 dark:focus:ring-zinc-600'
              }`}
              placeholder="Enter new password"
            />
            {password && (
              <div className="space-y-1.5">
                {validation.errors.length > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    <ul className="list-disc list-inside space-y-0.5">
                      {validation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.hints.length > 0 && validation.errors.length === 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    <ul className="list-none space-y-0.5">
                      {validation.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {!password && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={12}
              className={`w-full rounded-lg border px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-300 bg-white focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-600 dark:focus:ring-red-600'
                  : 'border-zinc-300 bg-white focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-600 dark:focus:ring-zinc-600'
              }`}
              placeholder="Confirm new password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !validation.isValid || password !== confirmPassword}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Loading...
          </p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
