"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";
import AtomIcon from "./AtomIcon";

const baseNavItems = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
];

export default function NavBar() {
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Build complete nav items list
  const allNavItems = [
    ...baseNavItems,
    ...(!loading && isAuthenticated
      ? [
          { href: "/profile", label: "Profile" },
        ]
      : !loading
      ? [
          { href: "/login", label: "Login/Sign Up" },
        ]
      : []),
  ];

  const getNavLinkClass = (href: string) => {
    const isActive = pathname === href;
    return `px-4 py-2 md:px-4 md:py-1.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "text-zinc-900 dark:text-zinc-50 underline decoration-2 underline-offset-4"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    }`;
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/80 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/80 py-3 md:py-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Lockup - Left Side */}
          <Link 
            href="/" 
            className="transition-opacity hover:opacity-80 cursor-pointer inline-flex items-center leading-none antialiased whitespace-nowrap"
            aria-label="Gameplay Labs - Home"
          >
            <span className="text-xl sm:text-2xl md:text-4xl font-bold leading-none">
              <span className="text-blue-600 dark:text-blue-400">Game</span>
              <span className="text-red-600 dark:text-red-400">play</span>
              {' '}
              <span className="text-green-600 dark:text-green-400">Labs</span>
            </span>
            <AtomIcon className="h-6 w-6 sm:h-6 sm:w-6 md:h-8 md:w-8 ml-1.5 sm:ml-2 flex-shrink-0" />
          </Link>

          {/* Desktop Nav - Hidden on Mobile */}
          <nav className="hidden md:flex items-center gap-2 whitespace-nowrap">
            {baseNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={getNavLinkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
            
            {!loading && isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className={getNavLinkClass("/profile")}
                >
                  Profile
                </Link>
                <Link
                  href="/about"
                  className={getNavLinkClass("/about")}
                >
                  About Us
                </Link>
                <button
                  onClick={handleLogout}
                  type="button"
                  className="px-4 py-1.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Logout
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className={getNavLinkClass("/login")}>
                  Login/Sign Up
                </Link>
                <Link href="/about" className={getNavLinkClass("/about")}>
                  About Us
                </Link>
              </>
            ) : null}
          </nav>

          {/* Mobile Hamburger Button - Hidden on Desktop */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div className="fixed top-[73px] right-0 bottom-0 w-64 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-50 md:hidden overflow-y-auto">
            <div className="p-4 space-y-1">
              {allNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`block py-3 px-4 rounded-lg ${getNavLinkClass(item.href)}`}
                >
                  {item.label}
                </Link>
              ))}
              {!loading && (
                <Link
                  href="/about"
                  onClick={handleLinkClick}
                  className={`block py-3 px-4 rounded-lg ${getNavLinkClass("/about")}`}
                >
                  About Us
                </Link>
              )}
              {!loading && isAuthenticated && (
                <button
                  onClick={() => {
                    handleLogout();
                    handleLinkClick();
                  }}
                  type="button"
                  className="w-full text-left py-3 px-4 rounded-lg text-sm font-medium text-zinc-600 transition-all duration-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
