/**
 * DocuNexa — Atomic Payment Approval PGlite WASM Integration Tests
 *
 * NOTE: These tests run inside a clean, isolated, disposable in-process PostgreSQL
 * engine (PGlite WebAssembly). They execute authentic PostgreSQL engine semantics,
 * transactions (BEGIN/COMMIT/ROLLBACK), PL/pgSQL functions, constraints, and row locks.
 * These are NOT tests against the remote production Supabase instance.
 *
 * Test Scenarios:
 * 1. Unauthorized admin caller rejection (caller not in admin_users).
 * 2. Case-insensitive double-spend replay rejection on same network rail.
 * 3. Cross-network identifier isolation: different networks do not collide.
 * 4. Provider deposit ID replay protection (bybit_deposit_id).
 * 5. Conflicting transaction ID rejection on already-confirmed order.
 * 6. Idempotent retries: zero duplicate audit logs, original confirmed_at preserved.
 * 7. Grandfathered permanent ad-free preservation (never sets expiration).
 * 8. Existing lifetime user purchasing a time-limited plan: lifetime preserved, payment audited.
 * 9. Active subscription duration extension (extends existing unexpired interval).
 * 10. Expired subscription renewal (starts duration from clock_timestamp).
 * 11. Unknown plan rejection (UNKNOWN_PLAN fails closed).
 * 12. Invalid duration rejection (INVALID_PLAN_DURATION fails closed).
 * 13. Free order rejection (INVALID_FREE_ORDER).
 * 14. Missing payment evidence rejection (MISSING_PAYMENT_EVIDENCE).
 * 15. Exceptional-status review justification enforcement (<10 chars rejected).
 * 16. Exceptional-status review justification accepted (>=10 chars).
 * 17. Ambiguous order admin resolution.
 * 18. Atomic rollback: failure during audit insertion rolls back all order and profile changes.
 * 19. Concurrency safety: multiple concurrent approval calls guarantee exactly one fulfillment.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

async function runPglitePostgreSqlTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — ATOMIC PAYMENT APPROVAL PGLITE WASM TESTS           ');
  console.log(' (Executed in Disposable In-Process PostgreSQL WASM Engine)     ');
  console.log('================================================================\n');

  const pg = new PGlite();

  // 1. Initialize disposable schema simulating EXACT PRE-MIGRATION PRODUCTION DATABASE
  console.log('--- 1. INITIALIZING DISPOSABLE PRE-MIGRATION PRODUCTION SCHEMA ---');
  await pg.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE auth.users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      email_confirmed_at TIMESTAMPTZ DEFAULT clock_timestamp()
    );

    CREATE TABLE public.admin_users (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'ad_free'))
    );

    -- Simulating exact pre-migration production payment_orders schema:
    -- Lacks reviewed_by, reviewed_at, review_notes, plan_id, subscription_duration_days
    -- Constrained to original 7 statuses only (missing 'ambiguous')
    -- Constrained to original 3 networks only (missing 'Bybit_UID')
    CREATE TABLE public.payment_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      order_id TEXT NOT NULL UNIQUE,
      product TEXT NOT NULL DEFAULT 'ad_free',
      base_amount_usd NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
      payment_amount_usdt NUMERIC(18, 6) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USDT',
      network TEXT NOT NULL DEFAULT 'Polygon',
      destination_address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      detected_at TIMESTAMPTZ,
      confirmed_at TIMESTAMPTZ,
      bybit_deposit_id TEXT UNIQUE,
      tx_id TEXT,
      received_amount NUMERIC(18, 6),
      failure_reason TEXT,
      coupon_id UUID DEFAULT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      CONSTRAINT payment_orders_network_check CHECK (network IN ('Polygon', 'Aptos', 'TRON')),
      CONSTRAINT payment_orders_status_check CHECK (status IN ('pending', 'detected', 'confirmed', 'expired', 'amount_mismatch', 'late_payment', 'cancelled'))
    );

    CREATE TABLE public.admin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      target_payment_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
      target_coupon_id UUID DEFAULT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
  `);

  // Create test user for pre-migration check
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('10101010-1010-1010-1010-101010101010', 'pre@test.com');
    INSERT INTO public.profiles (id, email, plan) VALUES ('10101010-1010-1010-1010-101010101010', 'pre@test.com', 'free');
  `);

  // Verify pre-migration constraints block 'ambiguous' status and 'Bybit_UID' network before migration is applied
  let preMigrationStatusCheckBlocked = false;
  try {
    await pg.exec(`
      INSERT INTO public.payment_orders (user_id, order_id, payment_amount_usdt, destination_address, expires_at, status)
      VALUES ('10101010-1010-1010-1010-101010101010', 'PRE-ORD-1', 2.0, '0xdest', clock_timestamp() + interval '1 hour', 'ambiguous');
    `);
  } catch (err: any) {
    if (err.message && err.message.includes('payment_orders_status_check')) {
      preMigrationStatusCheckBlocked = true;
    }
  }
  assert.strictEqual(preMigrationStatusCheckBlocked, true, 'Pre-migration status check must block ambiguous status');

  let preMigrationNetworkCheckBlocked = false;
  try {
    await pg.exec(`
      INSERT INTO public.payment_orders (user_id, order_id, payment_amount_usdt, destination_address, expires_at, network)
      VALUES ('10101010-1010-1010-1010-101010101010', 'PRE-ORD-2', 2.0, '403160324', clock_timestamp() + interval '1 hour', 'Bybit_UID');
    `);
  } catch (err: any) {
    if (err.message && err.message.includes('payment_orders_network_check')) {
      preMigrationNetworkCheckBlocked = true;
    }
  }
  assert.strictEqual(preMigrationNetworkCheckBlocked, true, 'Pre-migration network check must block Bybit_UID network');
  console.log('  ✓ [PRE-MIGRATION] Confirmed: Pre-migration schema blocks ambiguous status, Bybit_UID network, and lacks review columns');

  // 2. Apply the actual subscription plans and entitlements migration file directly
  console.log('--- 2. EXECUTING ACTUAL MIGRATION SQL FILE (20261108200000_subscription_plans_and_entitlements.sql) ---');
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261108200000_subscription_plans_and_entitlements.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await pg.exec(migrationSql);

  // Verify post-migration columns and status constraints
  const colQuery = await pg.query<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_orders'
      AND column_name IN ('reviewed_by', 'reviewed_at', 'review_notes', 'plan_id', 'subscription_duration_days');
  `);
  assert.strictEqual(colQuery.rows.length, 5, 'All 5 new payment_orders columns must exist post-migration');

  // Verify 'ambiguous' status and 'Bybit_UID' network can now be inserted
  await pg.exec(`
    INSERT INTO public.payment_orders (user_id, order_id, payment_amount_usdt, destination_address, expires_at, status, network)
    VALUES ('10101010-1010-1010-1010-101010101010', 'POST-MIG-AMBIG', 2.0, '403160324', clock_timestamp() + interval '1 hour', 'ambiguous', 'Bybit_UID');
  `);

  // Verify bogus status is still strictly rejected
  let bogusStatusBlocked = false;
  try {
    await pg.exec(`
      INSERT INTO public.payment_orders (user_id, order_id, payment_amount_usdt, destination_address, expires_at, status)
      VALUES ('10101010-1010-1010-1010-101010101010', 'POST-MIG-BOGUS', 2.0, '0xdest', clock_timestamp() + interval '1 hour', 'bogus_status');
    `);
  } catch (err: any) {
    if (err.message && err.message.includes('payment_orders_status_check')) {
      bogusStatusBlocked = true;
    }
  }
  assert.strictEqual(bogusStatusBlocked, true, 'Bogus status must be rejected by updated payment_orders_status_check');
  console.log('  ✓ [POST-MIGRATION] Confirmed: reviewed_by, reviewed_at, review_notes added, and payment_orders_status_check & payment_orders_network_check safely expanded\n');

  // Seed Admin & Users
  const adminId = '11111111-1111-1111-1111-111111111111';
  const nonAdminId = '99999999-9999-9999-9999-999999999999';
  const customerId1 = '22222222-2222-2222-2222-222222222222';
  const customerId2 = '33333333-3333-3333-3333-333333333333';

  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${adminId}', 'admin@docunexa.com'),
      ('${nonAdminId}', 'imposter@random.com'),
      ('${customerId1}', 'customer1@docunexa.com'),
      ('${customerId2}', 'customer2@docunexa.com');

    INSERT INTO public.admin_users (user_id) VALUES ('${adminId}');

    INSERT INTO public.profiles (id, email, plan) VALUES
      ('${adminId}', 'admin@docunexa.com', 'free'),
      ('${nonAdminId}', 'imposter@random.com', 'free'),
      ('${customerId1}', 'customer1@docunexa.com', 'free'),
      ('${customerId2}', 'customer2@docunexa.com', 'free');
  `);

  async function callRpc(paymentId: string, callerAdminId: string, txId?: string | null, bybitDepositId?: string | null, notes?: string | null) {
    const res = await pg.query<{ admin_approve_payment_atomic: any }>(`
      SELECT public.admin_approve_payment_atomic(
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::text,
        $5::text
      ) as admin_approve_payment_atomic;
    `, [paymentId, callerAdminId, txId || null, bybitDepositId || null, notes || null]);
    return res.rows[0].admin_approve_payment_atomic;
  }

  // TEST 1: Unauthorized Caller
  console.log('--- TEST 1: UNAUTHORIZED CALLER REJECTION ---');
  const orderId1 = 'aaaaaaaa-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${orderId1}', '${customerId1}', 'ORD-TEST-1', 2.0000, '0xdest1', clock_timestamp() + interval '1 hour');
  `);

  const unauthRes = await callRpc(orderId1, nonAdminId, '0xhash1');
  assert.strictEqual(unauthRes.success, false);
  assert.strictEqual(unauthRes.code, 'UNAUTHORIZED');
  console.log('  ✓ [PASS] Unauthorized caller (non-admin UUID) strictly rejected\n');

  // TEST 2: Replay Protection on Same Network
  console.log('--- TEST 2: DOUBLE-SPEND REPLAY ON SAME NETWORK (CASE-INSENSITIVE) ---');
  const approve1 = await callRpc(orderId1, adminId, '0xABCDEF123456');
  assert.strictEqual(approve1.success, true);
  assert.strictEqual(approve1.status, 'confirmed');

  const orderId2 = 'aaaaaaaa-2222-0000-0000-000000000002';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${orderId2}', '${customerId2}', 'ORD-TEST-2', 2.0000, '0xdest2', clock_timestamp() + interval '1 hour');
  `);

  const replayRes = await callRpc(orderId2, adminId, '0xabcdef123456');
  assert.strictEqual(replayRes.success, false);
  assert.strictEqual(replayRes.code, 'TRANSACTION_ALREADY_CONSUMED');
  console.log('  ✓ [PASS] Replay of transaction hash on same network strictly rejected (case-insensitive)\n');

  // TEST 3: Cross-Network Identifier Isolation
  console.log('--- TEST 3: CROSS-NETWORK IDENTIFIER ISOLATION ---');
  const orderId3 = 'aaaaaaaa-3333-0000-0000-000000000003';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, network, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${orderId3}', '${customerId2}', 'ORD-TEST-3', 'Aptos', 2.0000, '0xaptosdest', clock_timestamp() + interval '1 hour');
  `);

  const crossNetworkRes = await callRpc(orderId3, adminId, '0xabcdef123456');
  assert.strictEqual(crossNetworkRes.success, true);
  console.log('  ✓ [PASS] Cross-network identifier isolation confirmed (Polygon vs Aptos independent)\n');

  // TEST 4: Bybit Deposit ID Replay Protection
  console.log('--- TEST 4: BYBIT DEPOSIT ID REPLAY PROTECTION ---');
  const bybitOrder1 = 'bbbbbbbb-1111-0000-0000-000000000001';
  const bybitOrder2 = 'bbbbbbbb-2222-0000-0000-000000000002';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, network, payment_amount_usdt, destination_address, expires_at)
    VALUES
      ('${bybitOrder1}', '${customerId1}', 'BYBIT-1', 'Bybit_UID', 2.0000, '403160324', clock_timestamp() + interval '1 hour'),
      ('${bybitOrder2}', '${customerId2}', 'BYBIT-2', 'Bybit_UID', 2.0000, '403160324', clock_timestamp() + interval '1 hour');
  `);

  const bybitApprove1 = await callRpc(bybitOrder1, adminId, 'TX_BYBIT_001', 'BYBIT_DEP_777');
  assert.strictEqual(bybitApprove1.success, true);

  const bybitReplay = await callRpc(bybitOrder2, adminId, 'TX_BYBIT_002', 'BYBIT_DEP_777');
  assert.strictEqual(bybitReplay.success, false);
  assert.strictEqual(bybitReplay.code, 'BYBIT_DEPOSIT_ALREADY_CONSUMED');
  console.log('  ✓ [PASS] Bybit deposit ID replay strictly rejected\n');

  // TEST 5: IDEMPOTENCY SUITE (5 EXPLICIT SCENARIOS)
  console.log('--- TEST 5: IDEMPOTENCY SUITE (5 EXPLICIT SCENARIOS) ---');

  // 5.1: Already-confirmed order retried with conflicting evidence (conflicting tx_id)
  const conflictTxRes = await callRpc(bybitOrder1, adminId, 'TX_BYBIT_DIFFERENT', 'BYBIT_DEP_777');
  assert.strictEqual(conflictTxRes.success, false);
  assert.strictEqual(conflictTxRes.code, 'CONFLICTING_TX_ID');
  console.log('  ✓ [PASS] 5.1: Already-confirmed order retried with conflicting tx_id strictly rejected (CONFLICTING_TX_ID)');

  // 5.2: Already-confirmed order retried with a different Bybit deposit ID
  const conflictDepRes = await callRpc(bybitOrder1, adminId, 'TX_BYBIT_001', 'BYBIT_DEP_DIFFERENT');
  assert.strictEqual(conflictDepRes.success, false);
  assert.strictEqual(conflictDepRes.code, 'CONFLICTING_DEPOSIT_ID');
  console.log('  ✓ [PASS] 5.2: Already-confirmed order retried with different Bybit deposit ID rejected (CONFLICTING_DEPOSIT_ID)');

  // 5.3: Already-confirmed order retried with original evidence
  const retryOrigRes = await callRpc(bybitOrder1, adminId, 'TX_BYBIT_001', 'BYBIT_DEP_777');
  assert.strictEqual(retryOrigRes.success, true);
  assert.strictEqual(retryOrigRes.already_confirmed, true);
  console.log('  ✓ [PASS] 5.3: Already-confirmed order retried with original evidence returned already_confirmed: true');

  // 5.4: Already-confirmed order retried with omitted evidence
  const retryOmittedRes = await callRpc(bybitOrder1, adminId, null, null);
  assert.strictEqual(retryOmittedRes.success, true);
  assert.strictEqual(retryOmittedRes.already_confirmed, true);
  console.log('  ✓ [PASS] 5.4: Already-confirmed order retried with omitted evidence returned already_confirmed: true');

  // 5.5: Repeated approval must never extend subscription expiry twice
  const expiryCheckUser = '6b6b6b6b-6666-6666-6666-666666666666';
  const expiryCheckOrder = 'ee55ee55-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${expiryCheckUser}', 'expirycheck@docunexa.com');
    INSERT INTO public.profiles (id, email, plan, subscription_expires_at)
    VALUES ('${expiryCheckUser}', 'expirycheck@docunexa.com', 'free', NULL);

    INSERT INTO public.payment_orders (id, user_id, order_id, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${expiryCheckOrder}', '${expiryCheckUser}', 'EXPIRY-CHECK-ORD-1', 'monthly', 30, 3.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const firstApprove = await callRpc(expiryCheckOrder, adminId, '0xfirstapprovetx');
  assert.strictEqual(firstApprove.success, true);
  const firstExpiryIso = firstApprove.subscription_expires_at;
  assert.ok(firstExpiryIso, 'First approval must set subscription_expires_at');

  const auditCountBefore = Number((await pg.query<{ count: any }>(`SELECT count(*) FROM public.admin_audit_logs WHERE target_payment_id = '${expiryCheckOrder}'`)).rows[0].count);
  assert.strictEqual(auditCountBefore, 1);

  // Second approval (repeated call on same order)
  const secondApprove = await callRpc(expiryCheckOrder, adminId, '0xfirstapprovetx');
  assert.strictEqual(secondApprove.success, true);
  assert.strictEqual(secondApprove.already_confirmed, true);

  const profileAfterSecond = (await pg.query<{ subscription_expires_at: any }>(`SELECT subscription_expires_at FROM public.profiles WHERE id = '${expiryCheckUser}'`)).rows[0];
  assert.strictEqual(new Date(profileAfterSecond.subscription_expires_at).toISOString(), new Date(firstExpiryIso).toISOString(), 'Repeated approval must never extend subscription expiry');

  const auditCountAfter = Number((await pg.query<{ count: any }>(`SELECT count(*) FROM public.admin_audit_logs WHERE target_payment_id = '${expiryCheckOrder}'`)).rows[0].count);
  assert.strictEqual(auditCountAfter, 1, 'Repeated approval must not write duplicate audit logs');
  console.log('  ✓ [PASS] 5.5: Repeated approval strictly preserves expiry without extending twice or creating duplicate logs\n');

  // TEST 7: Grandfathered Permanent Ad-Free Preservation
  console.log('--- TEST 7: GRANDFATHERED PERMANENT AD-FREE PRESERVATION ---');
  const grandfatheredUser = '44444444-4444-4444-4444-444444444444';
  const gfOrder = 'cccccccc-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${grandfatheredUser}', 'gf@docunexa.com');
    INSERT INTO public.profiles (id, email, plan, subscription_expires_at)
    VALUES ('${grandfatheredUser}', 'gf@docunexa.com', 'ad_free', NULL);

    INSERT INTO public.payment_orders (id, user_id, order_id, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${gfOrder}', '${grandfatheredUser}', 'GF-ORDER-1', 'ad_free', 0, 2.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const gfApprove = await callRpc(gfOrder, adminId, '0xgftransaction');
  assert.strictEqual(gfApprove.success, true);
  assert.strictEqual(gfApprove.plan, 'ad_free');
  assert.strictEqual(gfApprove.subscription_expires_at, null);
  console.log('  ✓ [PASS] Grandfathered permanent Lifetime Ad-Free access strictly preserved with NULL expiry\n');

  // TEST 8: Existing Lifetime User Purchasing a Time-Limited Plan (LIFETIME PRESERVED)
  console.log('--- TEST 8: LIFETIME USER PURCHASING TIME-LIMITED PLAN (LIFETIME PRESERVED) ---');
  const gfUserBuyMonthly = 'cccccccc-2222-0000-0000-000000000002';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${gfUserBuyMonthly}', '${grandfatheredUser}', 'GF-BUY-MONTHLY', 'monthly', 'monthly', 30, 3.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const gfBuyMonthlyApprove = await callRpc(gfUserBuyMonthly, adminId, '0xgfbuymonthlytx');
  assert.strictEqual(gfBuyMonthlyApprove.success, true);
  assert.strictEqual(gfBuyMonthlyApprove.plan, 'ad_free', 'Lifetime user must remain ad_free');
  assert.strictEqual(gfBuyMonthlyApprove.subscription_expires_at, null, 'Lifetime user must NEVER receive an expiration date');

  const gfProfileAfterBuy = (await pg.query<{ plan: string; subscription_expires_at: any }>(`SELECT plan, subscription_expires_at FROM public.profiles WHERE id = '${grandfatheredUser}'`)).rows[0];
  assert.strictEqual(gfProfileAfterBuy.plan, 'ad_free');
  assert.strictEqual(gfProfileAfterBuy.subscription_expires_at, null);
  console.log('  ✓ [PASS] Existing lifetime user purchasing monthly plan had payment confirmed while lifetime status was preserved\n');

  // TEST 9: Active Time-Limited Subscription Extension
  console.log('--- TEST 9: ACTIVE SUBSCRIPTION EXTENSION ---');
  const subscriberUser = '55555555-5555-5555-5555-555555555555';
  const subOrder = 'dddddddd-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${subscriberUser}', 'sub@docunexa.com');
    INSERT INTO public.profiles (id, email, plan, subscription_expires_at)
    VALUES ('${subscriberUser}', 'sub@docunexa.com', 'monthly', clock_timestamp() + interval '10 days');

    INSERT INTO public.payment_orders (id, user_id, order_id, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${subOrder}', '${subscriberUser}', 'SUB-ORDER-1', 'monthly', 30, 3.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const subApprove = await callRpc(subOrder, adminId, '0xsubrenewal');
  assert.strictEqual(subApprove.success, true);

  const subProfile = (await pg.query<{ days_remaining: number }>(`
    SELECT round(extract(epoch from (subscription_expires_at - clock_timestamp())) / 86400) as days_remaining
    FROM public.profiles WHERE id = '${subscriberUser}'
  `)).rows[0];
  assert.ok(subProfile.days_remaining >= 39 && subProfile.days_remaining <= 41);
  console.log('  ✓ [PASS] Active subscription extended from previous expiry to ~40 days\n');

  // TEST 10: Expired Subscription Renewal
  console.log('--- TEST 10: EXPIRED SUBSCRIPTION RENEWAL ---');
  const expiredUser = '66666666-6666-6666-6666-666666666666';
  const expOrder = 'eeeeeeee-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${expiredUser}', 'expired@docunexa.com');
    INSERT INTO public.profiles (id, email, plan, subscription_expires_at)
    VALUES ('${expiredUser}', 'expired@docunexa.com', 'monthly', clock_timestamp() - interval '5 days');

    INSERT INTO public.payment_orders (id, user_id, order_id, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${expOrder}', '${expiredUser}', 'EXP-ORDER-1', 'weekly', 7, 1.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const expApprove = await callRpc(expOrder, adminId, '0xexptx');
  assert.strictEqual(expApprove.success, true);

  const expProfile = (await pg.query<{ days_remaining: number }>(`
    SELECT round(extract(epoch from (subscription_expires_at - clock_timestamp())) / 86400) as days_remaining
    FROM public.profiles WHERE id = '${expiredUser}'
  `)).rows[0];
  assert.ok(expProfile.days_remaining >= 6 && expProfile.days_remaining <= 8);
  console.log('  ✓ [PASS] Expired subscription renewal starts from clock_timestamp (~7 days)\n');

  // TEST 11: Unknown Plan Rejection
  console.log('--- TEST 11: UNKNOWN PLAN REJECTION (UNKNOWN_PLAN) ---');
  const unknownPlanOrder = 'ffffffff-0000-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${unknownPlanOrder}', '${customerId1}', 'UNKNOWN-PLAN-1', 'super_vip_tier', 'super_vip_tier', 30, 99.00, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const unknownPlanRes = await callRpc(unknownPlanOrder, adminId, '0xunknowntx');
  assert.strictEqual(unknownPlanRes.success, false);
  assert.strictEqual(unknownPlanRes.code, 'UNKNOWN_PLAN');
  console.log('  ✓ [PASS] Unknown plan identifier strictly rejected with code UNKNOWN_PLAN\n');

  // TEST 12: Invalid Paid Plan Duration Rejection (INVALID_PLAN_DURATION)
  console.log('--- TEST 12: INVALID PAID PLAN DURATION REJECTION (INVALID_PLAN_DURATION) ---');
  const badDurationOrder = 'ffffffff-0000-0000-0000-000000000002';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${badDurationOrder}', '${customerId1}', 'BAD-DUR-1', 'monthly', 'monthly', -5, 3.00, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const badDurationRes = await callRpc(badDurationOrder, adminId, '0xbaddurtx');
  assert.strictEqual(badDurationRes.success, false);
  assert.strictEqual(badDurationRes.code, 'INVALID_PLAN_DURATION');
  console.log('  ✓ [PASS] Non-positive duration on paid plan strictly rejected with code INVALID_PLAN_DURATION\n');

  // TEST 13: Free Order Approval Rejection (INVALID_FREE_ORDER)
  console.log('--- TEST 13: FREE ORDER REJECTION (INVALID_FREE_ORDER) ---');
  const freeOrder = 'ffffffff-0000-0000-0000-000000000003';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${freeOrder}', '${customerId1}', 'FREE-ORDER-1', 'free', 'free', 0, 0.00, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const freeOrderRes = await callRpc(freeOrder, adminId, '0xfreetx');
  assert.strictEqual(freeOrderRes.success, false);
  assert.strictEqual(freeOrderRes.code, 'INVALID_FREE_ORDER');
  console.log('  ✓ [PASS] Free order approval attempt strictly rejected with code INVALID_FREE_ORDER\n');

  // TEST 14: Missing Evidence Rejection (MISSING_PAYMENT_EVIDENCE)
  console.log('--- TEST 14: MISSING EVIDENCE REJECTION (MISSING_PAYMENT_EVIDENCE) ---');
  const noEvidenceOrder = 'ffffffff-0000-0000-0000-000000000004';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${noEvidenceOrder}', '${customerId1}', 'NO-EVID-1', 'monthly', 'monthly', 30, 3.00, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const noEvidenceRes = await callRpc(noEvidenceOrder, adminId, null, null, 'Review without evidence');
  assert.strictEqual(noEvidenceRes.success, false);
  assert.strictEqual(noEvidenceRes.code, 'MISSING_PAYMENT_EVIDENCE');
  console.log('  ✓ [PASS] Approval attempt with zero payment evidence strictly rejected with code MISSING_PAYMENT_EVIDENCE\n');

  // TEST 15 & 16: Exceptional Status Review Note Enforcement
  console.log('--- TEST 15 & 16: EXCEPTIONAL STATUS JUSTIFICATION ENFORCEMENT ---');
  const mismatchOrder = 'ffffffff-0000-0000-0000-000000000005';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, status, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${mismatchOrder}', '${customerId1}', 'MISMATCH-1', 'amount_mismatch', 'monthly', 'monthly', 30, 3.00, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  // Short reason (< 10 chars)
  const shortReasonRes = await callRpc(mismatchOrder, adminId, '0xmismatchtx', null, 'short');
  assert.strictEqual(shortReasonRes.success, false);
  assert.strictEqual(shortReasonRes.code, 'INSUFFICIENT_JUSTIFICATION');
  console.log('  ✓ [PASS] Short reason (<10 chars) for exceptional status rejected with code INSUFFICIENT_JUSTIFICATION');

  // Detailed reason (>= 10 chars)
  const detailedReasonRes = await callRpc(mismatchOrder, adminId, '0xmismatchtx', null, 'Customer sent 2.99 instead of 3.00, verified and accepted as courtesy');
  assert.strictEqual(detailedReasonRes.success, true);
  console.log('  ✓ [PASS] Detailed reason (>=10 chars) for exceptional status successfully approved\n');

  // TEST 17: Ambiguous Order Resolution
  console.log('--- TEST 17: AMBIGUOUS ORDER RESOLUTION ---');
  const ambiguousOrder = 'ffffffff-0000-0000-0000-000000000006';
  await pg.exec(`
    INSERT INTO public.payment_orders (id, user_id, order_id, status, network, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${ambiguousOrder}', '${customerId2}', 'AMBIGUOUS-1', 'ambiguous', 'Bybit_UID', 'monthly', 'monthly', 30, 3.00, '403160324', clock_timestamp() + interval '1 hour');
  `);

  const ambiguousRes = await callRpc(ambiguousOrder, adminId, 'TX_AMBIGUOUS_RESOLVED', 'BYBIT_DEP_AMBIG_1', 'Admin selected this invoice for customer ambiguity');
  assert.strictEqual(ambiguousRes.success, true);

  const approvedAmbiguousRow = (await pg.query<{
    status: string;
    reviewed_by: string;
    reviewed_at: any;
    review_notes: string;
  }>(`
    SELECT status, reviewed_by, reviewed_at, review_notes
    FROM public.payment_orders WHERE id = '${ambiguousOrder}'
  `)).rows[0];

  assert.strictEqual(approvedAmbiguousRow.status, 'confirmed');
  assert.strictEqual(approvedAmbiguousRow.reviewed_by, adminId);
  assert.ok(approvedAmbiguousRow.reviewed_at, 'reviewed_at must be populated');
  assert.strictEqual(approvedAmbiguousRow.review_notes, 'Admin selected this invoice for customer ambiguity');
  console.log('  ✓ [PASS] Ambiguous order successfully resolved by administrator selection; review columns verified\n');

  // TEST 18: Atomic Rollback on Audit Failure
  console.log('--- TEST 18: ATOMIC ROLLBACK ON AUDIT FAILURE ---');
  const rollbackUser = '77777777-7777-7777-7777-777777777777';
  const rollbackOrder = 'ffffffff-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${rollbackUser}', 'rollback@docunexa.com');
    INSERT INTO public.profiles (id, email, plan) VALUES ('${rollbackUser}', 'rollback@docunexa.com', 'free');

    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${rollbackOrder}', '${rollbackUser}', 'ROLLBACK-1', 'monthly', 'monthly', 30, 3.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  await pg.exec(`
    CREATE OR REPLACE FUNCTION trigger_simulate_audit_failure()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.reason = 'SIMULATE_FAILURE' THEN
        RAISE EXCEPTION 'Simulated fatal constraint failure inside admin_audit_logs';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER audit_failure_sim_trigger
    BEFORE INSERT ON public.admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_simulate_audit_failure();
  `);

  let failureCaught = false;
  try {
    await callRpc(rollbackOrder, adminId, '0xrollbackhash', null, 'SIMULATE_FAILURE');
  } catch (err: any) {
    failureCaught = true;
    assert.match(err.message, /Simulated fatal constraint failure/i);
  }
  assert.strictEqual(failureCaught, true);

  const checkOrder = (await pg.query<{ status: string; tx_id: any }>(`SELECT status, tx_id FROM public.payment_orders WHERE id = '${rollbackOrder}'`)).rows[0];
  const checkProfile = (await pg.query<{ plan: string }>(`SELECT plan FROM public.profiles WHERE id = '${rollbackUser}'`)).rows[0];

  assert.strictEqual(checkOrder.status, 'pending');
  assert.strictEqual(checkOrder.tx_id, null);
  assert.strictEqual(checkProfile.plan, 'free');
  console.log('  ✓ [PASS] Audit failure rolled back all mutations atomically (payment status=pending, plan=free)\n');

  await pg.exec(`DROP TRIGGER audit_failure_sim_trigger ON public.admin_audit_logs;`);

  // TEST 19: Concurrency Safety
  console.log('--- TEST 19: CONCURRENT APPROVAL RACE CONDITION ---');
  const raceUser = '88888888-8888-8888-8888-888888888888';
  const raceOrder = '99999999-1111-0000-0000-000000000001';
  await pg.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${raceUser}', 'race@docunexa.com');
    INSERT INTO public.profiles (id, email, plan) VALUES ('${raceUser}', 'race@docunexa.com', 'free');

    INSERT INTO public.payment_orders (id, user_id, order_id, product, plan_id, subscription_duration_days, payment_amount_usdt, destination_address, expires_at)
    VALUES ('${raceOrder}', '${raceUser}', 'RACE-1', 'monthly', 'monthly', 30, 3.0000, '0xdest', clock_timestamp() + interval '1 hour');
  `);

  const [resA, resB] = await Promise.all([
    callRpc(raceOrder, adminId, '0xracehash'),
    callRpc(raceOrder, adminId, '0xracehash'),
  ]);

  assert.strictEqual(resA.success, true);
  assert.strictEqual(resB.success, true);
  const oneIsAlreadyConfirmed = Boolean(resA.already_confirmed) !== Boolean(resB.already_confirmed);
  assert.strictEqual(oneIsAlreadyConfirmed, true);

  const raceAuditLogs = (await pg.query<{ count: string }>(`SELECT count(*) as count FROM public.admin_audit_logs WHERE target_payment_id = '${raceOrder}'`)).rows[0].count;
  assert.strictEqual(Number(raceAuditLogs), 1);
  console.log('  ✓ [PASS] Concurrency lock prevents duplicate fulfillment: exactly 1 audit log created\n');

  console.log('================================================================');
  console.log(' ALL 22 PGLITE WASM ATOMICITY & INTEGRITY TESTS PASSED!         ');
  console.log('================================================================');
}

runPglitePostgreSqlTests().catch((err) => {
  console.error('\n❌ PGlite WASM Integration Test failed:', err);
  process.exit(1);
});
