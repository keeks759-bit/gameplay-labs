/**
 * Admin user utilities
 * 
 * Shared helper for admin user identification across the application
 */

// Admin user UUIDs (bypass rate limiting, upload caps, etc.)
const ADMIN_USER_IDS = new Set<string>([
  'e570e7ed-d901-4af3-b1a1-77e57772a51c',
  'afb20822-fc72-42a5-8491-d9d4a96ff5b6',
]);

/**
 * Check if a user ID is an admin user
 */
export function isAdminUserId(userId: string | null): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.has(userId);
}
