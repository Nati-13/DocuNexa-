import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database, Profile } from './types';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Server-only privileged admin client for webhook fulfillment and security-critical updates.
 * NEVER expose to the browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';

  if (!serviceKey) {
    throw new Error('Supabase server secret key is required for privileged operations.');
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to fetch current authenticated user profile from Supabase.
 * Checks server auth session and returns profile data.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    // Fetch user profile from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Return basic user info with default free plan if profile row is still syncing
      return {
        id: user.id,
        email: user.email || '',
        plan: 'free',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return profile;
  } catch {
    return null;
  }
}

/**
 * Validates and retrieves server-side authenticated JWT claims using PKCE & cryptographic verification.
 */
export async function getServerAuthClaims(): Promise<Record<string, any> | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data || !data.claims) {
      return null;
    }
    return data.claims;
  } catch {
    return null;
  }
}
