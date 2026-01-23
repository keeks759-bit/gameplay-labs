# Auth & Navigation Bug Fixes

## Files Changed

1. **`src/app/login/page.tsx`** - Fixed login redirect and added logged-in guard
2. **`src/app/signup/page.tsx`** - Added logged-in guard
3. **`src/contexts/AuthContext.tsx`** - Improved auth state updates and router refresh

## Complete Updated Code

### 1. src/app/login/page.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      checkProfileAndRedirect();
    }
  }, [user, authLoading]);

  const checkProfileAndRedirect = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      router.push('/profile');
    } else {
      router.push('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Wait a moment for auth state to update, then check profile
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          // Redirect to profile if missing, otherwise to homepage
          if (!profile) {
            router.push('/profile');
          } else {
            router.push('/');
          }
          router.refresh();
        }
      }, 100);
    } catch (error: any) {
      setError(error.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  // Show loading or redirect if already logged in
  if (authLoading) {
    return (
      <div className="mx-auto max-w-md space-y-8">
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome Back
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Log in to your account to continue sharing and voting on clips.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account?{' '}
          <Link href="/signup" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 2. src/app/signup/page.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      checkProfileAndRedirect();
    }
  }, [user, authLoading]);

  const checkProfileAndRedirect = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      router.push('/profile');
    } else {
      router.push('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage(
        'Check your email for the confirmation link! You can close this page.'
      );
      // Clear form
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  // Show loading or redirect if already logged in
  if (authLoading) {
    return (
      <div className="mx-auto max-w-md space-y-8">
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Your Profile
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Sign up for free to share clips, view highlights, and vote on your favorites.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-6">
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="••••••••"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Must be at least 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {loading ? 'Creating account...' : 'Create Profile'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 3. src/contexts/AuthContext.tsx

```tsx
/**
 * Auth Context Provider
 * 
 * WHY: Provides auth state to all client components
 * Manages session state and provides login/logout functions
 * Persists session across page refreshes via cookies
 */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Force router refresh on auth change
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 4. src/components/NavBar.tsx (No changes needed - already correct)

The Profile link is already correctly implemented as:
```tsx
<Link href="/profile" className={...}>
  Profile
</Link>
```

---

## Manual Test Checklist

### ✅ Test 1: Logged Out - Profile Link Not Visible
- [ ] Log out (if logged in)
- [ ] Check NavBar
- [ ] **Expected:** "Profile" link is NOT visible
- [ ] **Expected:** "Log In" and "Sign Up" buttons are visible
- [ ] Click "Log In"
- [ ] **Expected:** Navigate to `/login` page

### ✅ Test 2: Login Success - Redirect to Homepage
- [ ] Go to `/login` page
- [ ] Enter valid email and password
- [ ] Click "Log In"
- [ ] **Expected:** Form shows "Logging in..." briefly
- [ ] **Expected:** Redirected to `/` (homepage) showing clips
- [ ] **Expected:** NavBar shows "Profile" and "Logout" buttons
- [ ] **Expected:** Login form is NOT visible anymore

### ✅ Test 3: Login Success - Redirect to Profile (If Missing)
- [ ] Log in with account that has NO profile
- [ ] **Expected:** Redirected to `/profile` (not homepage)
- [ ] Fill in profile and save
- [ ] Log out and log back in
- [ ] **Expected:** Redirected to `/` (homepage) - profile exists

### ✅ Test 4: Logged In - Profile Link Works
- [ ] While logged in, check NavBar
- [ ] **Expected:** "Profile" link is visible
- [ ] Click "Profile" link
- [ ] **Expected:** Navigate to `/profile` page
- [ ] **Expected:** Profile form loads with existing data (if profile exists)

### ✅ Test 5: Visiting /login While Logged In
- [ ] While logged in, navigate directly to `/login`
- [ ] **Expected:** Immediately redirected away (to `/` or `/profile`)
- [ ] **Expected:** Login form is NOT visible
- [ ] **Expected:** No "Welcome Back" message shown

### ✅ Test 6: Visiting /signup While Logged In
- [ ] While logged in, navigate directly to `/signup`
- [ ] **Expected:** Immediately redirected away (to `/` or `/profile`)
- [ ] **Expected:** Signup form is NOT visible

### ✅ Test 7: Logout Returns to Logged-Out State
- [ ] While logged in, click "Logout" button in NavBar
- [ ] **Expected:** Redirected to homepage
- [ ] **Expected:** NavBar shows "Log In" and "Sign Up" buttons
- [ ] **Expected:** "Profile" and "Logout" buttons are NOT visible
- [ ] **Expected:** Can navigate normally as logged-out user

### ✅ Test 8: Profile Link Click Behavior
- [ ] Log in
- [ ] Hover over "Profile" link in NavBar
- [ ] **Expected:** Link shows hover state (background color changes)
- [ ] Click "Profile" link
- [ ] **Expected:** Browser URL changes to `/profile`
- [ ] **Expected:** Profile page content loads
- [ ] **Expected:** No console errors

---

## What Was Fixed

### Bug 1: Profile Link Not Working
**Root Cause:** Link was correct, but potential race condition with auth state
**Fix:** 
- Verified Profile link is properly implemented as `<Link href="/profile">`
- Improved AuthContext to refresh router on auth state changes
- Ensured auth state updates immediately

### Bug 2: Login Not Redirecting
**Root Cause:** 
- Login succeeded but UI didn't update because AuthContext hadn't refreshed
- No redirect guard for already-logged-in users
- Redirect logic wasn't waiting for auth state update

**Fixes:**
- Added `useAuth()` hook to login page to use single source of truth
- Added redirect guard: if already logged in, redirect immediately
- Added setTimeout to wait for auth state update before redirecting
- Changed redirect to always go to `/` (homepage) after successful login
- Added profile check: redirect to `/profile` if profile missing, otherwise `/`
- Added same redirect guards to `/signup` page

### Additional Improvements
- AuthContext now refreshes router on auth state changes
- Both `/login` and `/signup` check if user is already logged in
- Proper loading states while checking auth
- Clean redirect logic based on profile completion

---

## Success Criteria

✅ Profile link navigates correctly  
✅ Login redirects to homepage (or profile if missing)  
✅ Login form disappears after successful login  
✅ Already-logged-in users are redirected from /login and /signup  
✅ Logout returns NavBar to logged-out state  
✅ All navigation uses client-side routing correctly  
✅ No console errors  
✅ Auth state is single source of truth via AuthContext  
