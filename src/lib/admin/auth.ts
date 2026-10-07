import { getCurrentProfile, createAdminSupabaseClient } from '@/lib/supabase/server';
import { Profile } from '@/lib/supabase/types';

export interface AdminAuthResult {
  isAdmin: boolean;
  profile: Profile | null;
  error?: string;
  statusCode?: number;
}

/**
 * Checks whether the specified user ID exists in the admin_users table.
 * Strictly uses server-side service role client.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    // Verify email is confirmed
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    if (!userData?.user || !userData.user.email_confirmed_at) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Server-side authorization guard for all /api/admin/* endpoints and server actions.
 *
 * Verifies:
 * 1. User is authenticated via valid Supabase session cookies
 * 2. User exists in admin_users table
 *
 * Throws or returns typed AdminAuthResult with appropriate status code (401 or 403).
 */
export async function requireAdmin(): Promise<{ profile: Profile; adminUserId: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    const err = new Error('Authentication required.');
    (err as any).statusCode = 401;
    throw err;
  }

  const isAdmin = await isUserAdmin(profile.id);
  if (!isAdmin) {
    const err = new Error('Access denied. Administrator privileges required.');
    (err as any).statusCode = 403;
    throw err;
  }

  return {
    profile,
    adminUserId: profile.id,
  };
}
