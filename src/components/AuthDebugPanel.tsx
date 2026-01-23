/**
 * Development-only debug panel for auth state
 * Shows session status, user id, and current path
 */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { User } from '@supabase/supabase-js';

export default function AuthDebugPanel() {
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [sessionExists, setSessionExists] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionExists(!!session);
      setUser(session?.user ?? null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionExists(!!session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-300 bg-white/90 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <div className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Auth Debug</div>
      <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
        <div>Session: {sessionExists ? '✅' : '❌'}</div>
        <div>User ID: {user?.id ? user.id.substring(0, 8) + '...' : 'None'}</div>
        <div>Path: {pathname}</div>
      </div>
    </div>
  );
}
