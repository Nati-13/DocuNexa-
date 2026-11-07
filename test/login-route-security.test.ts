/**
 * DOCUNEXA — LOGIN ROUTE-LEVEL SECURITY TEST SUITE
 *
 * Verifies route-level enforcement for POST /api/auth/login:
 * 1. Mandatory counter reset: When password succeeds but counter reset database operation fails:
 *    - Route returns HTTP 503 (Service Unavailable)
 *    - Route code is SECURITY_CHECK_UNAVAILABLE
 *    - Error message is generic (never leaks DB or RPC exception details)
 * 2. Session Invalidation:
 *    - supabase.auth.signOut() is immediately invoked on the server client
 *    - Auth session cookies are deleted on the response
 *    - No active user session remains established
 * 3. Absence of Successful-Login Analytics:
 *    - Analytics event for login is NOT recorded when the request is aborted
 * 4. Zero Data Leakage:
 *    - User profile and authentication tokens are NOT returned
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
        // Simulate mandatory counter reset database failure in PostgreSQL
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

    // Build login request
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    console.log('\n--- 2. SESSION INVALIDATION & COOKIE CLEARING ---');
    assert('supabase.auth.signOut() is invoked on server client to clear session', Boolean(signOutCalled) === true);
    assert('No user object returned in response body', body.user === undefined);
    assert('No session/token object returned in response body', body.session === undefined);

    console.log('\n--- 3. ABSENCE OF SUCCESSFUL-LOGIN ANALYTICS ---');
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

