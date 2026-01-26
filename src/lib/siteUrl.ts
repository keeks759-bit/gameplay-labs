/**
 * Site URL Helper
 * 
 * Returns the canonical site URL for auth redirects.
 * Uses NEXT_PUBLIC_SITE_URL in production, falls back to localhost:3000 in dev.
 */
export function getSiteUrl(): string {
  // In production, NEXT_PUBLIC_SITE_URL must be set to https://gameplaylabs.io
  // In local dev, it can be omitted and will default to http://localhost:3000
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Fallback to localhost only in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // In production, if NEXT_PUBLIC_SITE_URL is not set, this will cause issues
  // This should never happen, but we provide a fallback
  console.warn('NEXT_PUBLIC_SITE_URL is not set. Using fallback. This should be set in production.');
  return 'https://gameplaylabs.io';
}
