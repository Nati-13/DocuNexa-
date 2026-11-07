/**
 * DOCUNEXA — LOGIN ROUTE-LEVEL SECURITY & COOKIE CLEARING TEST SUITE
 *
 * Verifies route-level enforcement for POST /api/auth/login:
 * 1. Mandatory counter reset: When password succeeds but counter reset database operation fails:
 *    - Route returns HTTP 503 (Service Unavailable)
 *    - Route code is SECURITY_CHECK_UNAVAILABLE
 *    - Error message is generic (never leaks DB or RPC exception details)
 * 2. Session Invalidation & Cookie Expiration:
 *    - Simulated Supabase authentication cookies are present in request
 *    - supabase.auth.signOut() is invoked on the server client
 *    - Actual response contains cookie-expiration headers (Max-Age=0 / Expires=1970) for auth cookies
 *    - No active user session remains established
 * 3. Absence of Successful-Login Analytics:
 *    - Analytics event for login is NOT recorded when the request is aborted
 * 4. Zero Data Leakage:
 *    - User profile and authentication tokens are NOT returned in response body
 */

import { POST } from '../src/app/api/auth/login/route';
import {
  setMockAdminSupabaseClient,
  setMockServerSupabaseClient,
} from '../src/lib/supabase/server';

process.env.DOCUNEXA_TEST_ENV = 'true';
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, details?: string) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${description}${details ? ` (${details})` : ''}`);
    process.exitCode = 1;
  }
}

async function runRouteTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — LOGIN ROUTE SECURITY & SESSION CLEARING TESTS       ');
  console.log('================================================================\n');

  let signOutCalled: boolean = false;
  let analyticsDispatched: boolean = false;

  // Track analytics event dispatch
  try {
    const tracker = await import('../src/lib/analytics/tracker');
    const origRecord = tracker.recordAnalyticsEvent;
    (tracker as any).recordAnalyticsEvent = async (params: any) => {
      if (params.eventType === 'login') {
        analyticsDispatched = true;
      }
      return origRecord(params);
    };
  } catch {
    // tracker mock fallback
  }

  // 1. Mock Server Supabase Client
  const mockServerClient: any = {
    auth: {
      signInWithPassword: async () => ({
        data: {
          user: {
            id: 'd9b2d63d-a51b-4b18-b2a1-0e1b2c3d4e5f',
            email: 'victim@example.com',
            app_metadata: {},
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'fake-jwt-token',
            refresh_token: 'fake-refresh-token',
          },
        },
        error: null,
      }),
      signOut: async () => {
        signOutCalled = true;
        return { error: null };
      },
    },
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          if (table === 'legal_acceptances') {
            return { data: { id: 'acceptance-123' }, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (table === 'profiles') {
            return { data: { id: 'profile-123', plan: 'pro' }, error: null };
          }
          return { data: null, error: null };
        },
      };
      return chain;
    },
  };

  // 2. Mock Admin Supabase Client where record_successful_login fails
  const mockAdminClient: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string) => {
      if (fn === 'record_successful_login') {
        // Force mandatory counter reset database failure in PostgreSQL
        return {
          data: null,
          error: { message: 'Database connection failed during atomic reset' },
        };
      }
      return { data: null, error: null };
    },
  };

  try {
    setMockServerSupabaseClient(mockServerClient);
    setMockAdminSupabaseClient(mockAdminClient);

    // Build login request with SIMULATED SUPABASE AUTHENTICATION COOKIES PRESENT
    const simulatedAuthCookies =
      'sb-docunexa-auth-token=simulated-jwt-token-12345; sb-refresh-token=simulated-refresh-token-67890; unrelated-cookie=preference';

    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': simulatedAuthCookies,
        'x-request-id': 'test-req-sec-reset',
      },
      body: JSON.stringify({
        email: 'victim@example.com',
        password: 'ValidSecretPassword123!',
      }),
    });

    console.log('--- 1. ROUTE-LEVEL MANDATORY RESET FAILURE TEST ---');
    const res = await POST(req);
    const body = await res.json();

    assert('Login route returns HTTP 503 on counter reset failure', res.status === 503, `status = ${res.status}`);
    assert('Error code is SECURITY_CHECK_UNAVAILABLE', body.code === 'SECURITY_CHECK_UNAVAILABLE');
    assert(
      'Generic error message returned without leaking DB or RPC details',
      body.error === 'Authentication security service is temporarily unavailable. Please try again shortly.'
    );

    console.log('\n--- 2. SIGN-OUT & ACTUAL COOKIE EXPIRATION VERIFICATION ---');
    assert('supabase.auth.signOut() is invoked on server client to invalidate session', Boolean(signOutCalled) === true);

    // Inspect actual response cookies and Set-Cookie headers
    const resCookies = res.cookies ? res.cookies.getAll() : [];
    const rawSetCookieHeader = res.headers.get('set-cookie') || '';
    const getSetCookieHeaders = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [rawSetCookieHeader];
    const combinedSetCookieStr = getSetCookieHeaders.join('; ');

    // Verify deletion of the primary auth token cookie
    const authTokenCookie = resCookies.find((c) => c.name === 'sb-docunexa-auth-token');
    const authTokenDeleted =
      Boolean(authTokenCookie && (authTokenCookie.value === '' || authTokenCookie.maxAge === 0)) ||
      combinedSetCookieStr.includes('sb-docunexa-auth-token=;');

    assert(
      'Response contains cookie-expiration header for primary auth token (sb-docunexa-auth-token)',
      authTokenDeleted,
      `cookie=${JSON.stringify(authTokenCookie)}`
    );

    // Verify deletion of the refresh token cookie
    const refreshTokenCookie = resCookies.find((c) => c.name === 'sb-refresh-token');
    const refreshTokenDeleted =
      Boolean(refreshTokenCookie && (refreshTokenCookie.value === '' || refreshTokenCookie.maxAge === 0)) ||
      combinedSetCookieStr.includes('sb-refresh-token=;');

    assert(
      'Response contains cookie-expiration header for refresh token (sb-refresh-token)',
      refreshTokenDeleted,
      `cookie=${JSON.stringify(refreshTokenCookie)}`
    );

    // Confirm that unrelated cookie was NOT deleted
    const unrelatedCookieDeleted = resCookies.some((c) => c.name === 'unrelated-cookie');
    assert('Unrelated cookies are preserved without accidental deletion', !unrelatedCookieDeleted);

    console.log('\n--- 3. ZERO DATA LEAKAGE & ABSENCE OF ANALYTICS ---');
    assert('No user object returned in response body', body.user === undefined);
    assert('No session/token object returned in response body', body.session === undefined);
    assert('Successful-login analytics event was NOT dispatched for aborted request', Boolean(analyticsDispatched) === false);

    console.log('\n================================================================');
    console.log(` LOGIN ROUTE SECURITY TESTS: ${passed} of ${total} passed (${Math.round((passed / total) * 100)}%)`);
    if (passed === total) {
      console.log(' ALL LOGIN ROUTE SECURITY & SESSION CLEARING TESTS PASSED 100%!');
      console.log('================================================================\n');
    } else {
      console.error(` FAILURES: ${total - passed}`);
      process.exitCode = 1;
    }
  } finally {
    setMockServerSupabaseClient(null);
    setMockAdminSupabaseClient(null);
  }
}

runRouteTests().catch((err) => {
  console.error('Fatal error in login route security tests:', err);
  process.exit(1);
});
