import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database, Profile } from './types';

export async function createServerSupabaseClient() {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Graceful fallback when invoked outside Next.js request scope (e.g. unit tests, CLI scripts)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        try {
          if (cookieStore) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          }
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
let mockAdminClient: any = null;

/**
 * Injects a mock admin client for testing environments. Pass null to restore default behavior.
 * Strictly blocked in production environments to prevent test bypass.
 */
export function setMockAdminSupabaseClient(client: any) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return;
  }
  mockAdminClient = client;
}

/**
 * Creates a lightweight chainable mock Supabase client for unit test suites.
 */
export function createMockAdminSupabaseClient() {
  const chain: any = {
    select: () => chain,
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => chain,
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => chain,
    filter: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  return {
    from: (_table: string) => chain,
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        getUserById: async (id: string) => ({ data: { user: { id } }, error: null }),
        updateUserById: async (id: string) => ({ data: { user: { id } }, error: null }),
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
  };
}

export function createAdminSupabaseClient(): ReturnType<typeof createSupabaseClient<Database>> {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  // Test mock injection is strictly restricted to non-production test suites
  if (!isProduction && mockAdminClient) {
    return mockAdminClient as any;
  }
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
