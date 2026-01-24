"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/top", label: "Top" },
];

export default function NavBar() {
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if signOut fails
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 py-3 md:py-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link 
          href="/about" 
          className="transition-opacity hover:opacity-70 cursor-pointer opacity-100"
          aria-label="Gameplay Labs - Learn more about us"
        >
          <div className="rounded-full bg-zinc-900/5 border border-zinc-900/10 dark:bg-white/10 dark:border-white/10 px-3 py-2 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:px-0 md:py-0">
            <img 
              src="/gameplay-labs-logo.svg" 
              alt="Gameplay Labs" 
              className="h-12 w-auto opacity-100 drop-shadow-sm md:drop-shadow-none md:h-14"
            />
          </div>
        </Link>

        <nav className="flex items-center gap-2 md:gap-1 overflow-x-auto md:overflow-visible whitespace-nowrap scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-4 py-3 md:px-4 md:py-2 text-sm font-medium transition-all duration-200 min-w-[60px] md:min-w-0 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          
          {!loading && isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className={`ml-0 md:ml-2 rounded-lg px-4 py-3 md:px-4 md:py-2 text-sm font-medium transition-all duration-200 min-w-[60px] md:min-w-0 ${
                  pathname === "/profile"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                }`}
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                type="button"
                className="ml-0 md:ml-2 rounded-lg px-4 py-3 md:px-4 md:py-2 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 min-w-[60px] md:min-w-0"
              >
                Logout
              </button>
            </>
          ) : !loading ? (
            <div className="ml-0 md:ml-2 flex items-center gap-2 md:gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-3 md:px-4 md:py-2 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 min-w-[60px] md:min-w-0"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-zinc-900 px-4 py-3 md:px-4 md:py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 min-w-[70px] md:min-w-0"
              >
                Sign Up
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
