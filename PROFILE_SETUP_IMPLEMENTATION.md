# Profile Setup Implementation - Complete

## Files Changed/Created

### Modified Files
1. **`src/contexts/AuthContext.tsx`** - Fixed signOut to redirect to `/login`
2. **`src/app/profile/page.tsx`** - Full profile setup form (create/update)
3. **`src/app/login/page.tsx`** - Added profile check, redirects to `/profile` if missing
4. **`src/app/auth/callback/route.ts`** - Added profile check after email confirmation

### Created Files
5. **`database/profiles_table.sql`** - Database schema with RLS policies

### No Changes Needed
- **`src/components/NavBar.tsx`** - Already correct (Profile link works, Logout uses signOut)
- **`src/app/layout.tsx`** - Already wraps with AuthProvider

---

## Complete Code Files

### 1. src/contexts/AuthContext.tsx

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
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

### 2. src/app/profile/page.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const PLATFORM_OPTIONS = ['PC', 'PlayStation', 'Xbox', 'Switch'];
const GENRE_OPTIONS = ['FPS', 'RPG', 'Sports', 'Fighting', 'Racing', 'Strategy'];
const REGION_OPTIONS = ['NA-East', 'NA-West', 'EU', 'LATAM', 'APAC'];
const PLAYSTYLE_OPTIONS = ['Casual', 'Competitive', 'Creator'];

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [primaryGames, setPrimaryGames] = useState('');
  const [region, setRegion] = useState('');
  const [playstyle, setPlaystyle] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
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
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const profileData = {
        id: user!.id,
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
          .eq('id', user!.id)
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
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
    </div>
  );
}
```

### 3. src/app/login/page.tsx (Updated redirect logic)

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
      router.push('/');
    }
  }, [user, authLoading, router]);

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

      // Wait a moment for auth state to update, then check profile and redirect
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if profile exists
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

### 4. src/app/auth/callback/route.ts

```tsx
/**
 * Auth Callback Route
 * 
 * WHY: Handles email confirmation redirects from Supabase
 * After user clicks email confirmation link, Supabase redirects here
 * We exchange the code for a session and check if profile exists
 */
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Check if profile exists
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      // Redirect to profile if it doesn't exist
      if (!profile) {
        return NextResponse.redirect(new URL('/profile', requestUrl.origin));
      }
    }
  }

  // Redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
```

### 5. database/profiles_table.sql

```sql
-- ============================================
-- PROFILES TABLE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Creates the profiles table with proper constraints and RLS

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL UNIQUE,
  platforms TEXT[] DEFAULT '{}',
  favorite_genres TEXT[] DEFAULT '{}',
  primary_games TEXT,
  region TEXT,
  playstyle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Public can read profiles (for displaying usernames, etc.)
CREATE POLICY "Public can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Manual Test Checklist

### ✅ Test 1: Logged In - Profile Link Navigates
- [ ] Log in to your account
- [ ] Check NavBar - "Profile" link should be visible
- [ ] Click "Profile" link
- [ ] **Expected:** Navigate to `/profile` page
- [ ] **Expected:** Profile form loads (empty if no profile, filled if profile exists)
- [ ] **Expected:** URL shows `/profile`

### ✅ Test 2: Logged In - Save Profile Creates Row
- [ ] Navigate to `/profile` while logged in
- [ ] Fill in form:
  - Display Name: `TestUser123` (required)
  - Platforms: Select at least one (e.g., PC) (required)
  - Favorite Genres: Select multiple (e.g., FPS, RPG)
  - Primary Games: `Valorant, CS2`
  - Region: `NA-East`
  - Playstyle: `Competitive`
- [ ] Click "Create Profile" (or "Update Profile" if exists)
- [ ] **Expected:** Green success message appears
- [ ] **Expected:** Button text changes to "Update Profile"
- [ ] Refresh page (F5)
- [ ] **Expected:** Form is pre-filled with saved data
- [ ] **Expected:** Profile persists in database

### ✅ Test 3: Logged In - Logout Signs Out
- [ ] While logged in, click "Logout" button in NavBar
- [ ] **Expected:** Redirected to `/login` page
- [ ] **Expected:** NavBar shows "Log In" and "Sign Up" buttons
- [ ] **Expected:** "Profile" and "Logout" buttons are NOT visible
- [ ] **Expected:** No console errors
- [ ] Try to access `/profile` directly
- [ ] **Expected:** Redirected to `/login?redirect=/profile`

### ✅ Test 4: After Login - New User Goes to Profile
- [ ] Log out (if logged in)
- [ ] Log in with account that has NO profile
- [ ] **Expected:** After successful login, redirected to `/profile` (not homepage)
- [ ] Fill in profile and save
- [ ] Log out and log back in
- [ ] **Expected:** Redirected to `/` (homepage) - profile exists

### ✅ Test 5: After Login - Existing Profile Goes to Homepage
- [ ] Log in with account that HAS a profile
- [ ] **Expected:** Redirected to `/` (homepage) immediately
- [ ] **Expected:** NOT redirected to `/profile`
- [ ] Navigate to `/profile` manually
- [ ] **Expected:** Form is pre-filled with existing profile data

### ✅ Test 6: Logged Out - Profile Redirects to Login
- [ ] Log out (if logged in)
- [ ] Navigate directly to `/profile` (type in browser or click link)
- [ ] **Expected:** Automatically redirected to `/login?redirect=/profile`
- [ ] Log in
- [ ] **Expected:** Redirected to `/profile` (if no profile) or `/` (if profile exists)

### ✅ Test 7: Profile Form Validation
- [ ] Navigate to `/profile` while logged in
- [ ] Try to submit with empty Display Name
- [ ] **Expected:** Browser validation prevents submit (required field)
- [ ] Fill Display Name but don't select any platforms
- [ ] **Expected:** "Create Profile" button is disabled
- [ ] Select at least one platform
- [ ] **Expected:** Button becomes enabled

### ✅ Test 8: Profile Update Flow
- [ ] With existing profile, navigate to `/profile`
- [ ] **Expected:** Form is pre-filled
- [ ] Change some values (e.g., add more platforms, change region)
- [ ] Click "Update Profile"
- [ ] **Expected:** Success message appears
- [ ] Refresh page
- [ ] **Expected:** Updated values are shown

---

## Database Setup Required

**Before testing, run the SQL:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `database/profiles_table.sql`
3. Click "Run"
4. Verify success: Should see "Success. No rows returned"

---

## Success Criteria

✅ Profile link navigates to `/profile`  
✅ Profile can be created and saved  
✅ Profile persists across page refreshes  
✅ Logout signs out and redirects to `/login`  
✅ NavBar updates correctly after logout  
✅ New users redirected to `/profile` after login  
✅ Users with profiles redirected to `/` after login  
✅ Logged-out users redirected from `/profile` to `/login`  
✅ No console errors  
✅ No TypeScript errors  

All fixes and features are implemented. Run the database SQL and test using the checklist above.
