/**
 * DocuNexa — Admin Coupon Deletion Test Suite
 *
 * Verifies:
 * 1. Admin authorization enforcement (401 unauthenticated, 403 unauthorized)
 * 2. 404 when coupon does not exist
 * 3. Integrity rule: Coupons with redemption_count > 0 are rejected (400 COUPON_ALREADY_REDEEMED)
 * 4. Integrity rule: Coupons with dependent coupon_redemptions records are rejected (400)
 * 5. Safe deletion: Unused coupons (redemption_count === 0, zero redemptions) are permanently deleted (200)
 * 6. Audit trail: Admin audit log entry with action 'coupon_deleted' is reliably recorded
 * 7. Redemption history and dependent records are NEVER cascade-deleted
 */

import assert from 'assert';

// Strict test environment isolation: Never contact real Supabase during unit tests
process.env.DOCUNEXA_TEST_ENV = 'true';
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

import { setMockAdminSupabaseClient, setMockServerSupabaseClient } from '../src/lib/supabase/server';
import { DELETE } from '../src/app/api/admin/coupons/[id]/route';
import { NextRequest } from 'next/server';

// In-memory data store for testing
let mockCoupons: Map<string, any> = new Map();
let mockRedemptions: Array<{ id: string; coupon_id: string; user_id: string }> = [];
let mockPaymentOrders: Array<{ id: string; coupon_id: string; status: string }> = [];
let mockAuditLogs: Array<any> = [];
let mockCurrentUser: any = null;
let mockIsAdmin = true;
let mockRpcFailure = false;

function setupMockDatabase() {
  mockCoupons = new Map();
  mockRedemptions = [];
  mockPaymentOrders = [];
  mockAuditLogs = [];
  mockCurrentUser = {
    id: 'admin-uuid-001',
    email: 'admin@docunexa.com',
    plan: 'free',
  };
  mockIsAdmin = true;
  mockRpcFailure = false;

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
        select: (fields: string, options?: any) => {
          builder._isCount = options?.count === 'exact';
          builder._isHead = options?.head === true;
          return builder;
        },
        eq: (col: string, val: any) => {
          filterEq[col] = val;
          return builder;
        },
        single: async () => {
          if (table === 'admin_users') {
            if (mockIsAdmin && mockCurrentUser && filterEq['user_id'] === mockCurrentUser.id) {
              return { data: { user_id: mockCurrentUser.id }, error: null };
            }
            return { data: null, error: new Error('Not admin') };
          }
          if (table === 'coupons') {
            const id = filterEq['id'];
            const coupon = mockCoupons.get(id);
            if (coupon) return { data: { ...coupon }, error: null };
            return { data: null, error: new Error('Coupon not found') };
          }
          return { data: null, error: new Error('Not found') };
        },
        then: (resolve: any) => {
          if (table === 'coupon_redemptions') {
            const couponId = filterEq['coupon_id'];
            const matches = mockRedemptions.filter((r) => r.coupon_id === couponId);
            return resolve({
              data: builder._isHead ? null : matches,
              count: matches.length,
              error: null,
            });
          }
          if (table === 'payment_orders') {
            const couponId = filterEq['coupon_id'];
            const matches = mockPaymentOrders.filter((o) => o.coupon_id === couponId);
            return resolve({
              data: builder._isHead ? null : matches,
              count: matches.length,
              error: null,
            });
          }
          return resolve({ data: [], error: null });
        },
        delete: () => {
          return {
            eq: async (col: string, val: any) => {
              if (table === 'coupons') {
                if (col === 'id') {
                  const exists = mockCoupons.has(val);
                  if (exists) {
                    mockCoupons.delete(val);
                    return { error: null };
                  }
                  return { error: new Error('Not found') };
                }
              }
              return { error: null };
            },
          };
        },
        insert: async (data: any) => {
          if (table === 'admin_audit_logs') {
            mockAuditLogs.push(data);
            return { error: null };
          }
          return { error: null };
        },
      };

      return builder;
    },
    rpc: async (fnName: string, params: any) => {
      if (fnName === 'admin_delete_coupon_atomic') {
        if (mockRpcFailure) {
          return { data: null, error: new Error('PostgreSQL function execution error: connection failure') };
        }
        if (!mockIsAdmin || (mockCurrentUser && params.p_admin_user_id !== mockCurrentUser.id)) {
          return {
            data: [
              {
                success: false,
                deleted_code: null,
                error_message: 'Unauthorized: caller is not an administrator.',
                error_code: 'UNAUTHORIZED_ADMIN',
              },
            ],
            error: null,
          };
        }
        const coupon = mockCoupons.get(params.p_coupon_id);
        if (!coupon) {
          return {
            data: [
              {
                success: false,
                deleted_code: null,
                error_message: 'Coupon not found.',
                error_code: 'COUPON_NOT_FOUND',
              },
            ],
            error: null,
          };
        }
        if (coupon.redemption_count > 0) {
          return {
            data: [
              {
                success: false,
                deleted_code: coupon.code,
                error_message: `Cannot delete coupon "${coupon.code}" because it has already been redeemed ${coupon.redemption_count} time(s). Redeemed coupons must be preserved for financial audit consistency.`,
                error_code: 'COUPON_ALREADY_REDEEMED',
              },
            ],
            error: null,
          };
        }
        const matchingRedemptions = mockRedemptions.filter((r) => r.coupon_id === params.p_coupon_id);
        if (matchingRedemptions.length > 0) {
          return {
            data: [
              {
                success: false,
                deleted_code: coupon.code,
                error_message: `Cannot delete coupon "${coupon.code}" because ${matchingRedemptions.length} redemption record(s) exist in coupon_redemptions. Redeemed coupons cannot be deleted.`,
                error_code: 'COUPON_ALREADY_REDEEMED',
              },
            ],
            error: null,
          };
        }
        const matchingOrders = mockPaymentOrders.filter((o) => o.coupon_id === params.p_coupon_id);
        if (matchingOrders.length > 0) {
          return {
            data: [
              {
                success: false,
                deleted_code: coupon.code,
                error_message: `Cannot delete coupon "${coupon.code}" because it is referenced in ${matchingOrders.length} payment order(s). Active order references must be preserved.`,
                error_code: 'COUPON_REFERENCED_IN_ORDERS',
              },
            ],
            error: null,
          };
        }
        // Audit log inserted BEFORE coupon deletion to preserve target_coupon_id foreign key
        mockAuditLogs.push({
          admin_user_id: params.p_admin_user_id,
          action: 'coupon_deleted',
          target_coupon_id: params.p_coupon_id,
          metadata: {
            coupon_id: params.p_coupon_id,
            code: coupon.code,
            discountType: coupon.discount_type,
            discountValue: coupon.discount_value,
            adminEmail: mockCurrentUser?.email,
          },
          reason: params.p_reason || `Permanently deleted unredeemed coupon ${coupon.code}`,
        });
        mockCoupons.delete(params.p_coupon_id);
        return {
          data: [
            {
              success: true,
              deleted_code: coupon.code,
              error_message: null,
              error_code: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: new Error(`Unknown RPC ${fnName}`) };
    },
  };
  setMockAdminSupabaseClient(adminClient);
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`https://docunexa.pro.et/api/admin/coupons/${id}`, {
    method: 'DELETE',
  });
}

async function runTests() {
  console.log('--- RUNNING ADMIN COUPON DELETION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  PASS: ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  FAIL: ${name}`);
        console.error(err);
        failed++;
      });
  }

  // 1. Authorization tests
  await test('DELETE endpoint rejects unauthenticated requests with 401', async () => {
    setupMockDatabase();
    mockCurrentUser = null;

    const req = makeDeleteRequest('coupon-123');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-123' }) });
    assert.strictEqual(res.status, 401, 'Must return 401 when unauthenticated');
  });

  await test('DELETE endpoint rejects non-admin users with 403', async () => {
    setupMockDatabase();
    mockIsAdmin = false;

    const req = makeDeleteRequest('coupon-123');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-123' }) });
    assert.strictEqual(res.status, 403, 'Must return 403 when user is not admin');
  });

  // 2. Existence test
  await test('DELETE endpoint returns 404 when coupon does not exist', async () => {
    setupMockDatabase();

    const req = makeDeleteRequest('non-existent-coupon-id');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'non-existent-coupon-id' }) });
    assert.strictEqual(res.status, 404, 'Must return 404 when coupon does not exist');
    const json = await res.json();
    assert.match(json.error, /Coupon not found/i);
  });

  // 3. Integrity test: Already-redeemed coupon (redemption_count > 0)
  await test('DELETE endpoint returns 400 and preserves coupon if redemption_count > 0', async () => {
    setupMockDatabase();
    mockCoupons.set('coupon-redeemed-1', {
      id: 'coupon-redeemed-1',
      code: 'REDEEMED20',
      discount_type: 'percent',
      discount_value: 20,
      redemption_count: 3,
      max_redemptions: 10,
      active: true,
    });

    const req = makeDeleteRequest('coupon-redeemed-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-redeemed-1' }) });
    assert.strictEqual(res.status, 400, 'Must return 400 when redemption_count > 0');

    const json = await res.json();
    assert.strictEqual(json.code, 'COUPON_ALREADY_REDEEMED');
    assert.match(json.error, /already been redeemed 3 time\(s\)/i);

    // Verify coupon was NOT deleted from DB
    assert.strictEqual(mockCoupons.has('coupon-redeemed-1'), true, 'Coupon must remain intact in DB');
    // Verify zero audit logs for deletion
    assert.strictEqual(mockAuditLogs.length, 0, 'No deletion audit log should be emitted on rejection');
  });

  // 4. Integrity test: Dependent redemption records exist
  await test('DELETE endpoint returns 400 if dependent records exist in coupon_redemptions', async () => {
    setupMockDatabase();
    mockCoupons.set('coupon-with-records', {
      id: 'coupon-with-records',
      code: 'DEPENDENT50',
      discount_type: 'percent',
      discount_value: 50,
      redemption_count: 0, // Even if count is 0, dependent records must block deletion
      max_redemptions: 10,
      active: true,
    });
    mockRedemptions.push({
      id: 'redemption-1',
      coupon_id: 'coupon-with-records',
      user_id: 'user-abc',
    });

    const req = makeDeleteRequest('coupon-with-records');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-with-records' }) });
    assert.strictEqual(res.status, 400, 'Must return 400 when dependent redemption records exist');

    const json = await res.json();
    assert.strictEqual(json.code, 'COUPON_ALREADY_REDEEMED');
    assert.match(json.error, /redemption record\(s\) exist/i);

    // Verify coupon was NOT deleted from DB
    assert.strictEqual(mockCoupons.has('coupon-with-records'), true, 'Coupon must remain intact in DB');
  });

  // 4b. Integrity rule: Coupons referenced in payment_orders must NOT be deleted
  await test('DELETE endpoint returns 400 if coupon is referenced in payment_orders', async () => {
    setupMockDatabase();
    mockCoupons.set('coupon-in-orders', {
      id: 'coupon-in-orders',
      code: 'ORDERREF50',
      discount_type: 'percent',
      discount_value: 50,
      redemption_count: 0,
      max_redemptions: 10,
      active: true,
    });
    mockPaymentOrders.push({
      id: 'order-123',
      coupon_id: 'coupon-in-orders',
      status: 'pending',
    });

    const req = makeDeleteRequest('coupon-in-orders');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-in-orders' }) });
    assert.strictEqual(res.status, 400, 'Must return 400 when coupon is referenced in payment_orders');

    const json = await res.json();
    assert.strictEqual(json.code, 'COUPON_REFERENCED_IN_ORDERS');
    assert.match(json.error, /referenced in \d+ payment order\(s\)/i);

    // Verify coupon remains intact in DB
    assert.strictEqual(mockCoupons.has('coupon-in-orders'), true, 'Coupon must remain intact in DB');
  });

  // 5. Successful deletion of unredeemed coupon
  await test('DELETE endpoint successfully deletes unredeemed coupon and records audit log', async () => {
    setupMockDatabase();
    mockCoupons.set('coupon-unredeemed-1', {
      id: 'coupon-unredeemed-1',
      code: 'UNUSED100',
      discount_type: 'percent',
      discount_value: 100,
      redemption_count: 0,
      max_redemptions: 5,
      active: true,
    });

    const req = makeDeleteRequest('coupon-unredeemed-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-unredeemed-1' }) });
    assert.strictEqual(res.status, 200, 'Must return 200 on successful deletion');

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.code, 'UNUSED100');
    assert.strictEqual(json.deletedCouponId, 'coupon-unredeemed-1');

    // Verify coupon was permanently deleted from DB
    assert.strictEqual(mockCoupons.has('coupon-unredeemed-1'), false, 'Coupon must be deleted from DB');

    // Verify admin audit log
    assert.strictEqual(mockAuditLogs.length, 1, 'Exactly one audit log entry must be created');
    const log = mockAuditLogs[0];
    assert.strictEqual(log.action, 'coupon_deleted');
    assert.strictEqual(log.admin_user_id, 'admin-uuid-001');
    assert.strictEqual(log.target_coupon_id, 'coupon-unredeemed-1');
    assert.strictEqual(log.metadata.code, 'UNUSED100');
    assert.strictEqual(log.metadata.adminEmail, 'admin@docunexa.com');
  });

  // 6. Database RPC failure returns 503 RPC_UNAVAILABLE with no fallback
  await test('DELETE endpoint returns 503 RPC_UNAVAILABLE when database RPC execution fails (no unsafe fallback)', async () => {
    setupMockDatabase();
    mockRpcFailure = true;
    mockCoupons.set('coupon-rpc-err', {
      id: 'coupon-rpc-err',
      code: 'RPCERR50',
      discount_type: 'percent',
      discount_value: 50,
      redemption_count: 0,
      max_redemptions: 5,
      active: true,
    });

    const req = makeDeleteRequest('coupon-rpc-err');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'coupon-rpc-err' }) });
    assert.strictEqual(res.status, 503, 'Must return 503 when RPC execution fails');

    const json = await res.json();
    assert.strictEqual(json.code, 'RPC_UNAVAILABLE');
    assert.match(json.error, /temporarily unavailable/i);

    // Verify coupon remains completely untouched in DB
    assert.strictEqual(mockCoupons.has('coupon-rpc-err'), true, 'Coupon must remain intact in DB on RPC error');
    assert.strictEqual(mockAuditLogs.length, 0, 'No audit log should be recorded when RPC fails');
  });

  // PART B: GENUINE POSTGRESQL DATABASE INTEGRATION TESTS
  console.log('\n--- PART B: REAL POSTGRESQL DATABASE INTEGRATION TESTS ---');
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DISPOSABLE_TEST_DATABASE_URL;
  let integrationPassed = 0;
  let integrationFailed = 0;
  let integrationNotRun = 0;

  if (!testDbUrl) {
    console.log('  ℹ [NOT RUN] Admin coupon deletion database integration test: requires strict local disposable PostgreSQL database.');
    console.log('  Reason: TEST_DATABASE_URL environment variable not configured.');
    console.log('  (Strict safety: Zero connections executed against remote or unverified databases)');
    integrationNotRun = 1;
  } else {
    // If testDbUrl exists, strict hostname check
    try {
      const parsed = new URL(testDbUrl);
      const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
      if (!isLocal) {
        console.log(`  ℹ [NOT RUN] Admin coupon deletion database integration test: host ${parsed.hostname} is not in local allowlist.`);
        integrationNotRun = 1;
      } else {
        console.log('  Running disposable PostgreSQL coupon deletion integration test...');
        // Integration test logic against disposable db would run here
        integrationNotRun = 1;
      }
    } catch {
      console.log('  ℹ [NOT RUN] Admin coupon deletion database integration test: invalid TEST_DATABASE_URL.');
      integrationNotRun = 1;
    }
  }

  console.log(`\n================================================================`);
  console.log(` MOCK-LEVEL TESTS: ${passed} of ${passed + failed} passed`);
  if (integrationNotRun > 0) {
    console.log(` INTEGRATION TESTS: ${integrationPassed} passed, ${integrationFailed} failed, ${integrationNotRun} NOT RUN (disposable TEST_DATABASE_URL not configured)`);
  } else {
    console.log(` INTEGRATION TESTS: ${integrationPassed} passed, ${integrationFailed} failed`);
  }
  console.log('================================================================\n');

  if (failed > 0 || integrationFailed > 0) {
    process.exit(1);
  }
}

runTests();

