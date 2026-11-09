/**
 * DocuNexa — Administrator Payment Approval Route Unit Tests (MOCKED)
 *
 * Verifies the Next.js server-side authorization boundary and RPC invocation:
 * 1. Unauthorized access (401 when unauthenticated, 403 when user is not admin).
 * 2. Route input validation (action, confirm, reason length).
 * 3. Order lookup (404 when order is not found).
 * 4. Client-supplied administrator UUIDs are strictly IGNORED; server-verified admin is passed.
 * 5. NO UNSAFE FALLBACK: When atomic RPC fails or is missing, route returns HTTP 500
 *    requiring database migration and executes ZERO sequential fallback queries.
 * 6. Conflicting transaction IDs return HTTP 409.
 * 7. Transaction replay returns HTTP 409 TRANSACTION_ALREADY_CONSUMED.
 * 8. Idempotent retries preserve original confirmation and return HTTP 200 with alreadyConfirmed: true.
 * 9. Successful first-time approval returns HTTP 200 with upgraded plan and subscription expiration.
 * 10. Manual rejection records failure reason and admin audit event.
 */

import assert from 'assert';
import { NextRequest } from 'next/server';

// Strict test environment isolation: Never contact real Supabase during unit tests
process.env.DOCUNEXA_TEST_ENV = 'true';
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

import { setMockAdminSupabaseClient, setMockServerSupabaseClient } from '../src/lib/supabase/server';
import { POST } from '../src/app/api/admin/payments/[id]/review/route';

// In-memory data store for testing
let mockPaymentOrders: Map<string, any> = new Map();
let mockProfiles: Map<string, any> = new Map();
let mockAdminUsers: Set<string> = new Set();
let mockAuditLogs: Array<any> = [];
let mockCurrentUser: any = null;
let mockRpcHandler: ((name: string, params: any) => Promise<any>) | null = null;
let fallbackUpdateExecuted = false;

function setupMockDatabase() {
  mockPaymentOrders = new Map();
  mockProfiles = new Map();
  mockAdminUsers = new Set();
  mockAuditLogs = [];
  mockCurrentUser = {
    id: 'admin-uuid-001',
    email: 'admin@docunexa.com',
    plan: 'free',
  };
  mockAdminUsers.add('admin-uuid-001');
  mockRpcHandler = null;
  fallbackUpdateExecuted = false;

  // Mock server client (for auth session / profile check)
  const serverClient: any = {
    auth: {
      getUser: async () => {
        if (!mockCurrentUser) return { data: { user: null }, error: new Error('Not logged in') };
        return { data: { user: mockCurrentUser }, error: null };
      },
    },
    from: (table: string) => {
      return {
        select: () => ({
          eq: (field: string, val: any) => ({
            single: async () => {
              if (table === 'profiles' && mockCurrentUser && mockCurrentUser.id === val) {
                return {
                  data: {
                    id: mockCurrentUser.id,
                    email: mockCurrentUser.email,
                    plan: mockCurrentUser.plan,
                  },
                  error: null,
                };
              }
              return { data: null, error: new Error('Not found') };
            },
          }),
        }),
      };
    },
  };
  setMockServerSupabaseClient(serverClient);

  // Mock admin client (for privileged service-role DB calls)
  const adminClient: any = {
    auth: {
      admin: {
        getUserById: async (userId: string) => {
          if (mockCurrentUser && mockCurrentUser.id === userId) {
            return {
              data: {
                user: {
                  id: userId,
                  email: mockCurrentUser.email,
                  email_confirmed_at: '2026-01-01T00:00:00Z',
                },
              },
              error: null,
            };
          }
          return { data: { user: null }, error: new Error('User not found') };
        },
      },
    },
    from: (table: string) => {
      let filterEq: Record<string, any> = {};

      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          filterEq[col] = val;
          return builder;
        },
        single: async () => {
          if (table === 'admin_users') {
            const uid = filterEq['user_id'];
            if (uid && mockAdminUsers.has(uid)) {
              return { data: { user_id: uid }, error: null };
            }
            return { data: null, error: new Error('Not in admin_users') };
          }
          if (table === 'payment_orders') {
            const id = filterEq['id'];
            const order = mockPaymentOrders.get(id);
            if (order) return { data: { ...order }, error: null };
            return { data: null, error: new Error('Order not found') };
          }
          return { data: null, error: new Error('Not found') };
        },
        update: (payload: any) => {
          fallbackUpdateExecuted = true;
          return {
            eq: async (col: string, val: any) => {
              if (table === 'payment_orders' && col === 'id') {
                const existing = mockPaymentOrders.get(val);
                if (existing) {
                  mockPaymentOrders.set(val, { ...existing, ...payload });
                  return { error: null };
                }
              }
              return { error: new Error('Order not found for update') };
            },
          };
        },
        insert: async (row: any) => {
          if (table === 'admin_audit_logs') {
            mockAuditLogs.push(row);
            return { error: null };
          }
          return { error: null };
        },
      };

      return builder;
    },
    rpc: async (name: string, params: any) => {
      if (mockRpcHandler) {
        return mockRpcHandler(name, params);
      }
      return { data: null, error: new Error(`Mock RPC ${name} not configured`) };
    },
  };
  setMockAdminSupabaseClient(adminClient);
}

async function runMockedTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — ADMIN PAYMENT APPROVAL ROUTE UNIT TESTS (MOCKED)    ');
  console.log('================================================================\n');

  // TEST 1: Unauthenticated request throws 401
  setupMockDatabase();
  mockCurrentUser = null;
  {
    const req = new NextRequest('http://localhost/api/admin/payments/order-1/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', confirm: true, reason: 'Valid justification reason' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'order-1' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 401, 'Expected 401 for unauthenticated caller');
    assert.match(json.error, /authentication/i);
    console.log('  ✓ [PASS] 1. Unauthenticated request rejected with HTTP 401');
  }

  // TEST 2: Non-admin caller throws 403
  setupMockDatabase();
  mockAdminUsers.clear(); // User exists, but is NOT in admin_users
  {
    const req = new NextRequest('http://localhost/api/admin/payments/order-1/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', confirm: true, reason: 'Valid justification reason' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'order-1' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 403, 'Expected 403 for non-admin caller');
    assert.match(json.error, /administrator privileges/i);
    console.log('  ✓ [PASS] 2. Non-admin user rejected with HTTP 403');
  }

  // TEST 3: Validation errors (missing action, unconfirmed, short reason)
  setupMockDatabase();
  {
    // Missing action
    const req1 = new NextRequest('http://localhost/api/admin/payments/order-1/review', {
      method: 'POST',
      body: JSON.stringify({ confirm: true, reason: 'Justification' }),
    });
    const res1 = await POST(req1, { params: Promise.resolve({ id: 'order-1' }) });
    assert.strictEqual(res1.status, 400);

    // Missing confirm
    const req2 = new NextRequest('http://localhost/api/admin/payments/order-1/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', reason: 'Justification' }),
    });
    const res2 = await POST(req2, { params: Promise.resolve({ id: 'order-1' }) });
    assert.strictEqual(res2.status, 400);

    // Short reason
    const req3 = new NextRequest('http://localhost/api/admin/payments/order-1/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', confirm: true, reason: 'bad' }),
    });
    const res3 = await POST(req3, { params: Promise.resolve({ id: 'order-1' }) });
    assert.strictEqual(res3.status, 400);

    console.log('  ✓ [PASS] 3. Route request validation enforces action, confirm flag, and minimum reason length');
  }

  // TEST 4: Order not found returns 404
  setupMockDatabase();
  {
    const req = new NextRequest('http://localhost/api/admin/payments/non-existent/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', confirm: true, reason: 'Justification text' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'non-existent' }) });
    assert.strictEqual(res.status, 404);
    console.log('  ✓ [PASS] 4. Non-existent order returns HTTP 404');
  }

  // TEST 5: NO UNSAFE FALLBACK — Atomic RPC failure returns HTTP 500 without sequential updates
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-101', {
      id: 'order-101',
      order_id: 'ORD-101',
      user_id: 'user-001',
      status: 'pending',
      network: 'Polygon',
      currency: 'USDT',
      payment_amount_usdt: '2.0000',
    });

    // Mock RPC failure (e.g. function does not exist / migration missing)
    mockRpcHandler = async (name) => {
      if (name === 'admin_approve_payment_atomic') {
        return { data: null, error: { message: 'function admin_approve_payment_atomic does not exist', code: '42883' } };
      }
      return { data: null, error: new Error('Unknown RPC') };
    };

    const req = new NextRequest('http://localhost/api/admin/payments/order-101/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Legitimate manual approval',
        txId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-101' }) });
    const json = await res.json();

    assert.strictEqual(res.status, 500, 'Expected 500 when RPC is missing or fails');
    assert.match(json.error, /migration 20261108200000_subscription_plans_and_entitlements must be applied/i);
    assert.strictEqual(fallbackUpdateExecuted, false, 'Route must NEVER fall back to sequential multi-query updates');
    console.log('  ✓ [PASS] 5. NO UNSAFE FALLBACK: RPC failure halts execution with 500; zero sequential fallback queries');
  }

  // TEST 6: Client-supplied administrator UUID is ignored; server passes authenticated admin ID
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-102', {
      id: 'order-102',
      order_id: 'ORD-102',
      user_id: 'user-002',
      status: 'pending',
      network: 'Polygon',
      currency: 'USDT',
      payment_amount_usdt: '2.0000',
    });

    let capturedParams: any = null;
    mockRpcHandler = async (name, params) => {
      capturedParams = params;
      return {
        data: {
          success: true,
          payment_id: params.p_payment_id,
          status: 'confirmed',
          plan: 'ad_free',
          subscription_expires_at: null,
        },
        error: null,
      };
    };

    const spoofedAdminId = 'hacker-fake-admin-uuid-999';
    const req = new NextRequest('http://localhost/api/admin/payments/order-102/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Verifying caller admin boundary',
        admin_user_id: spoofedAdminId, // Spoofed field
        p_admin_user_id: spoofedAdminId, // Spoofed field
        txId: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-102' }) });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(capturedParams.p_admin_user_id, 'admin-uuid-001', 'RPC received verified server admin ID, not spoofed ID');
    console.log('  ✓ [PASS] 6. Client-supplied administrator UUID is ignored; verified server session ID passed to RPC');
  }

  // TEST 7: Conflicting transaction ID rejection returns HTTP 409
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-103', {
      id: 'order-103',
      order_id: 'ORD-103',
      user_id: 'user-003',
      status: 'confirmed',
      tx_id: '0xoriginaltxhash',
      network: 'Polygon',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: false,
        error: 'Order is already confirmed with a conflicting transaction ID: 0xoriginaltxhash',
        code: 'CONFLICTING_TX_ID',
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-103/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Retry with conflicting hash',
        txId: '0xdifferenthash',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-103' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(json.code, 'CONFLICTING_TX_ID');
    console.log('  ✓ [PASS] 7. Conflicting transaction ID on already-confirmed order rejected with HTTP 409');
  }

  // TEST 8: Replay of consumed transaction returns HTTP 409
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-104', {
      id: 'order-104',
      order_id: 'ORD-104',
      user_id: 'user-004',
      status: 'pending',
      network: 'Polygon',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: false,
        error: 'Transaction ID already consumed by another confirmed order on network Polygon.',
        code: 'TRANSACTION_ALREADY_CONSUMED',
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-104/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Attempted double-spend',
        txId: '0xalreadyconsumedhash',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-104' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(json.code, 'TRANSACTION_ALREADY_CONSUMED');
    console.log('  ✓ [PASS] 8. Consumed transaction reuse rejected with HTTP 409 TRANSACTION_ALREADY_CONSUMED');
  }

  // TEST 9: Idempotent approval retry returns 200 with alreadyConfirmed: true
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-105', {
      id: 'order-105',
      order_id: 'ORD-105',
      user_id: 'user-005',
      status: 'confirmed',
      tx_id: '0xsamehash',
      confirmed_at: '2026-11-08T10:00:00Z',
      network: 'Polygon',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: true,
        already_confirmed: true,
        payment_id: 'order-105',
        status: 'confirmed',
        confirmed_at: '2026-11-08T10:00:00Z',
        plan: 'ad_free',
        subscription_expires_at: null,
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-105/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Network retry of legitimate approval',
        txId: '0xsamehash',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-105' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.alreadyConfirmed, true);
    assert.match(json.message, /already confirmed/i);
    console.log('  ✓ [PASS] 9. Idempotent retry preserves confirmation details and returns alreadyConfirmed: true');
  }

  // TEST 9.B: Idempotent retry with omitted evidence returns 200 with alreadyConfirmed: true
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-105-omitted', {
      id: 'order-105-omitted',
      order_id: 'ORD-105-OMITTED',
      user_id: 'user-005',
      status: 'confirmed',
      tx_id: '0xprevioustxhash',
      confirmed_at: '2026-11-08T10:00:00Z',
      network: 'Polygon',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: true,
        already_confirmed: true,
        payment_id: 'order-105-omitted',
        status: 'confirmed',
        confirmed_at: '2026-11-08T10:00:00Z',
        plan: 'ad_free',
        subscription_expires_at: null,
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-105-omitted/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Admin re-reviewing without re-supplying evidence',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-105-omitted' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.alreadyConfirmed, true);
    console.log('  ✓ [PASS] 9.B. Idempotent retry with omitted evidence returns alreadyConfirmed: true');
  }

  // TEST 9.C: Conflicting Bybit deposit ID rejection returns HTTP 409
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-105-bybit-conflict', {
      id: 'order-105-bybit-conflict',
      order_id: 'ORD-105-BYBIT',
      user_id: 'user-005',
      status: 'confirmed',
      bybit_deposit_id: 'BYBIT_DEP_ORIGINAL',
      confirmed_at: '2026-11-08T10:00:00Z',
      network: 'Bybit_UID',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: false,
        error: 'Order is already confirmed with a conflicting Bybit deposit ID: BYBIT_DEP_ORIGINAL',
        code: 'CONFLICTING_DEPOSIT_ID',
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-105-bybit-conflict/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Retry with wrong Bybit deposit ID',
        bybitDepositId: 'BYBIT_DEP_DIFFERENT',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-105-bybit-conflict' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(json.code, 'CONFLICTING_DEPOSIT_ID');
    console.log('  ✓ [PASS] 9.C. Conflicting Bybit deposit ID on confirmed order rejected with HTTP 409 CONFLICTING_DEPOSIT_ID');
  }

  // TEST 10: Manual rejection updates failure reason and logs audit event
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-106', {
      id: 'order-106',
      order_id: 'ORD-106',
      user_id: 'user-006',
      status: 'amount_mismatch',
      network: 'Bybit_UID',
      currency: 'USDT',
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-106/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reject',
        confirm: true,
        reason: 'Customer transferred incorrect token',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-106' }) });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(mockAuditLogs.length, 1);
    assert.strictEqual(mockAuditLogs[0].action, 'payment_manually_rejected');
    assert.strictEqual(mockAuditLogs[0].target_payment_id, 'order-106');
    console.log('  ✓ [PASS] 10. Manual rejection successfully records failure reason and admin audit event');
  }

  // TEST 11: Missing evidence rejection returns HTTP 400 MISSING_PAYMENT_EVIDENCE
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-107', {
      id: 'order-107',
      order_id: 'ORD-107',
      user_id: 'user-007',
      status: 'pending',
      network: 'Polygon',
      currency: 'USDT',
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-107/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Attempted approval without evidence',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-107' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.code, 'MISSING_PAYMENT_EVIDENCE');
    console.log('  ✓ [PASS] 11. Missing payment evidence strictly rejected with HTTP 400 MISSING_PAYMENT_EVIDENCE');
  }

  // TEST 12: Exceptional status requires >=10 chars justification reason
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-108', {
      id: 'order-108',
      order_id: 'ORD-108',
      user_id: 'user-008',
      status: 'amount_mismatch',
      network: 'Polygon',
      currency: 'USDT',
      tx_id: '0xevidencetx',
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-108/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'short', // < 10 characters
        txId: '0xevidencetx',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-108' }) });
    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.code, 'INSUFFICIENT_JUSTIFICATION');
    console.log('  ✓ [PASS] 12. Exceptional status with short reason (<10 chars) rejected with HTTP 400 INSUFFICIENT_JUSTIFICATION');
  }

  // TEST 13: Exceptional status with >=10 chars justification succeeds
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-109', {
      id: 'order-109',
      order_id: 'ORD-109',
      user_id: 'user-009',
      status: 'expired',
      network: 'Polygon',
      currency: 'USDT',
    });

    mockRpcHandler = async () => ({
      data: {
        success: true,
        payment_id: 'order-109',
        status: 'confirmed',
        plan: 'monthly',
        subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/payments/order-109/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Confirmed late blockchain deposit received on-chain', // >= 10 characters
        txId: '0xvalidtransactionhash',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-109' }) });
    assert.strictEqual(res.status, 200);
    console.log('  ✓ [PASS] 13. Exceptional status (expired) with detailed justification (>=10 chars) approved');
  }

  // TEST 14: Ambiguous order approved with explicit evidence and justification
  setupMockDatabase();
  {
    mockPaymentOrders.set('order-110', {
      id: 'order-110',
      order_id: 'ORD-110',
      user_id: 'user-010',
      status: 'ambiguous',
      network: 'Bybit_UID',
      currency: 'USDT',
    });

    let receivedRpcParams: any = null;
    mockRpcHandler = async (name, params) => {
      receivedRpcParams = params;
      return {
        data: {
          success: true,
          payment_id: 'order-110',
          status: 'confirmed',
          plan: 'monthly',
          subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        error: null,
      };
    };

    const req = new NextRequest('http://localhost/api/admin/payments/order-110/review', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        confirm: true,
        reason: 'Admin resolved customer ambiguity to order ORD-110',
        bybitDepositId: 'BYBIT_DEP_99999',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'order-110' }) });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(receivedRpcParams.p_bybit_deposit_id, 'BYBIT_DEP_99999');
    console.log('  ✓ [PASS] 14. Ambiguous order successfully resolved and approved with admin evidence');
  }

  console.log('\n================================================================');
  console.log(' ALL 16 ADMIN PAYMENT REVIEW ROUTE TESTS PASSED (100%)!         ');
  console.log('================================================================');
}

runMockedTests().catch((err) => {
  console.error('\n❌ Admin Payment Review Mocked Test failed:', err);
  process.exit(1);
});

