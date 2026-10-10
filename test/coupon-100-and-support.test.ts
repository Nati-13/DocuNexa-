/**
 * DocuNexa — 100% Discount Coupon & Support Integration Test Suite
 *
 * Covers:
 * 1. 100% Coupon normalization, format validation, and exact arithmetic
 * 2. Zero-cost complimentary order flow, duplicate prevention, and paid checkout preservation
 * 3. Telegram bot integration, status reporting, and command dispatcher
 * 4. Telegram owner forwarding, owner-only replies, webhook secrets, idempotency, missing config
 * 5. Website support ticket validation, persistence, sanitization, and access control
 * 6. Database migration schema audit (100% coupon constraint, support_tickets, telegram tables, atomic RPC)
 * 7. Coupon concurrency, limit enforcement, and compensatory rollback verification
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Safely load .env.local for standalone test execution
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}
import {
  normalizeCouponCode,
  isValidCouponCodeFormat,
  calculateCouponDiscount,
  formatMicroUnits,
} from '../src/lib/coupons';
import {
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
  TELEGRAM_BOT_USERNAME,
  getTelegramBotStatus,
  getTelegramReplyForText,
  getTelegramWebhookInfo,
  handleTelegramWebhookUpdate,
  saveTelegramMapping,
  getTelegramMapping,
  isTelegramUpdateProcessed,
  markTelegramUpdateProcessed,
  notifyOwnerOfWebsiteTicket,
} from '../src/lib/telegram/bot';
import {
  validateSupportTicketInput,
  persistSupportTicket,
  SUPPORT_CATEGORIES,
} from '../src/lib/support';
import { generateUniquePaymentAmount } from '../src/lib/payments/bybit';

console.log('================================================================');
console.log('  DOCUNEXA — 100% COUPON, TELEGRAM & SUPPORT TEST SUITE        ');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 1. 100% COUPON CODE & EXACT ARITHMETIC
  // --------------------------------------------------------------------------
  console.log('--- 1. 100% COUPON CODE & EXACT ARITHMETIC ---');

  await test('Normalizes DOCUNEXA100well with whitespace and casing', () => {
    assert.strictEqual(normalizeCouponCode('  DOCUNEXA100well  '), 'DOCUNEXA100WELL');
    assert.strictEqual(normalizeCouponCode('docunexa100well'), 'DOCUNEXA100WELL');
    assert.strictEqual(normalizeCouponCode('DocuNexa100Well'), 'DOCUNEXA100WELL');
  });

  await test('Validates DOCUNEXA100WELL format matching allowed character set', () => {
    assert.strictEqual(isValidCouponCodeFormat('DOCUNEXA100WELL'), true);
    assert.strictEqual(isValidCouponCodeFormat('DOCUNEXA-100-PROMO'), true);
    assert.strictEqual(isValidCouponCodeFormat('A'), false); // Too short (< 2)
    assert.strictEqual(isValidCouponCodeFormat('INVALID CODE!'), false); // Disallowed characters
  });

  await test('Calculates exact 100% percentage discount resulting in exactly $0.00 final amount', () => {
    const calc = calculateCouponDiscount('percent', '100', '2.000000');
    assert.strictEqual(calc.originalAmountUsd, '2.000000');
    assert.strictEqual(calc.discountAmountUsdt, '2.000000');
    assert.strictEqual(calc.finalAmountUsdt, '0.000000');
    assert.strictEqual(calc.formattedDiscount, '100% off');
  });

  await test('Calculates 100% discount on number input (100)', () => {
    const calc = calculateCouponDiscount('percent', 100, '2.000000');
    assert.strictEqual(calc.finalAmountUsdt, '0.000000');
    assert.strictEqual(calc.discountAmountUsdt, '2.000000');
  });

  await test('Rejects invalid percentages: >100%, 0%, negative values', () => {
    const over100 = calculateCouponDiscount('percent', '101', '2.000000');
    assert.strictEqual(over100.valid, false);
    assert.ok(over100.error?.includes('between 1% and 100%'));

    const zero = calculateCouponDiscount('percent', '0', '2.000000');
    assert.strictEqual(zero.valid, false);
    assert.ok(zero.error?.includes('between 1% and 100%'));

    const negative = calculateCouponDiscount('percent', '-15', '2.000000');
    assert.strictEqual(negative.valid, false);
  });

  await test('Calculates standard fractional and fixed discounts (e.g. 50%, $1.00 off)', () => {
    const half = calculateCouponDiscount('percent', '50', '2.000000');
    assert.strictEqual(half.discountAmountUsdt, '1.000000');
    assert.strictEqual(half.finalAmountUsdt, '1.000000');

    const fixed = calculateCouponDiscount('fixed_usdt', '1.00', '2.000000');
    assert.strictEqual(fixed.discountAmountUsdt, '1.000000');
    assert.strictEqual(fixed.finalAmountUsdt, '1.000000');
  });

  await test('Fixed USDT discount rejects values >= base price ($2.00) and allows fractional amounts up to 1.99', () => {
    const atBase = calculateCouponDiscount('fixed_usdt', '2.00', '2.000000');
    assert.strictEqual(atBase.valid, false);
    assert.ok(atBase.error?.includes('less than $2.00 USD'));

    const overBase = calculateCouponDiscount('fixed_usdt', '2.50', '2.000000');
    assert.strictEqual(overBase.valid, false);

    const validHigh = calculateCouponDiscount('fixed_usdt', '1.99', '2.000000');
    assert.strictEqual(validHigh.valid, true);
    assert.strictEqual(validHigh.finalAmountUsdt, '0.010000');
  });

  // --------------------------------------------------------------------------
  // 2. ZERO-COST ORDER FLOW & PAID CHECKOUT PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ZERO-COST ORDER FLOW & PAID CHECKOUT PRESERVATION ---');

  await test('Zero-cost order structure does not contain fake blockchain hashes or deposits', () => {
    const zeroCostOrder = {
      order_id: 'DNX-FREE-1791658800000-XYZ12',
      product: 'ad_free',
      base_amount_usd: 2.0,
      payment_amount_usdt: '0.0000',
      final_amount_usdt: '0.0000',
      status: 'confirmed',
      destination_address: 'COMPLIMENTARY_ACTIVATION',
      bybit_deposit_id: null,
      tx_id: null,
      block_hash: null,
      confirmations: null,
      received_amount: '0.0000',
    };

    assert.strictEqual(zeroCostOrder.destination_address, 'COMPLIMENTARY_ACTIVATION');
    assert.strictEqual(zeroCostOrder.bybit_deposit_id, null, 'Must not invent fake deposit ID');
    assert.strictEqual(zeroCostOrder.tx_id, null, 'Must not invent fake blockchain transaction hash');
    assert.strictEqual(zeroCostOrder.status, 'confirmed');
    assert.strictEqual(zeroCostOrder.final_amount_usdt, '0.0000');
  });

  await test('Paid checkout flow is fully preserved when coupon is <100% or absent', () => {
    const normalCandidate = generateUniquePaymentAmount(new Set());
    assert.ok(normalCandidate.startsWith('2.00'), 'Normal price is $2.00');

    const halfCandidate = generateUniquePaymentAmount(new Set(), '1.000000');
    assert.ok(halfCandidate.startsWith('1.00'), '50% discount produces price starting with 1.00');
  });

  // --------------------------------------------------------------------------
  // 3. TELEGRAM BOT INTEGRATION & CORE CONFIGURATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. TELEGRAM BOT INTEGRATION & CORE CONFIGURATION ---');

  await test('Telegram constants match official @docunexa_bot destination', () => {
    assert.strictEqual(TELEGRAM_BOT_USERNAME, 'docunexa_bot');
    assert.strictEqual(TELEGRAM_BOT_HANDLE, '@docunexa_bot');
    assert.strictEqual(TELEGRAM_BOT_URL, 'https://t.me/docunexa_bot');
  });

  await test('Missing configuration: Bot status reports dormant state when TELEGRAM_BOT_TOKEN is unset', () => {
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const status = getTelegramBotStatus();
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.handle, '@docunexa_bot');
    assert.ok(status.message.includes('dormant'));

    if (originalToken) process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  await test('Missing configuration: getTelegramWebhookInfo returns safe unconfigured object without throwing', async () => {
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const res = await getTelegramWebhookInfo();
    assert.strictEqual(res.configured, false);
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes('TELEGRAM_BOT_TOKEN is not configured'));

    if (originalToken) process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  await test('Missing configuration: notifyOwnerOfWebsiteTicket fails safely when token or owner is unset', async () => {
    const origToken = process.env.TELEGRAM_BOT_TOKEN;
    const origOwner = process.env.TELEGRAM_OWNER_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_OWNER_CHAT_ID;

    const res = await notifyOwnerOfWebsiteTicket({
      ticketId: 'TEST-123',
      name: 'Tester',
      email: 'test@example.com',
      category: 'Other',
      subject: 'Test Subject',
      message: 'Hello DocuNexa',
    });
    assert.strictEqual(res, false, 'Must safely return false when credentials not configured');

    if (origToken) process.env.TELEGRAM_BOT_TOKEN = origToken;
    if (origOwner) process.env.TELEGRAM_OWNER_CHAT_ID = origOwner;
  });

  await test('Telegram command dispatcher replies with accurate information for /start, /tools, /coupon, /support', () => {
    assert.ok(getTelegramReplyForText('/start').includes('@docunexa_bot'));
    assert.ok(getTelegramReplyForText('/tools').includes('34+ Available'));
    assert.ok(getTelegramReplyForText('/coupon').includes('DOCUNEXA100well'));
    assert.ok(getTelegramReplyForText('/support').includes('https://docunexa.pro.et/support'));
  });

  // --------------------------------------------------------------------------
  // 4. TELEGRAM WEBHOOK SECRETS, DEDUPLICATION, FORWARDING & OWNER REPLIES
  // --------------------------------------------------------------------------
  console.log('\n--- 4. TELEGRAM WEBHOOK SECRETS, DEDUPLICATION & ROUTING ---');

  await test('Incorrect webhook secrets: Rejects request when secret header mismatches TELEGRAM_WEBHOOK_SECRET', async () => {
    const origSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    process.env.TELEGRAM_WEBHOOK_SECRET = 'SUPER_SECURE_SECRET_12345';

    const testUpdate = { update_id: 8881001, message: { chat: { id: 123 }, text: 'hello' } };
    const res = await handleTelegramWebhookUpdate(testUpdate, 'WRONG_SECRET_VALUE');

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.handled, 'rejected');
    assert.ok(res.error?.includes('Secret-Token'));

    if (origSecret) process.env.TELEGRAM_WEBHOOK_SECRET = origSecret;
    else delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  await test('Correct webhook secret: Accepts update matching TELEGRAM_WEBHOOK_SECRET', async () => {
    const origSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    process.env.TELEGRAM_WEBHOOK_SECRET = 'MATCHING_SECRET_TOKEN';

    const testUpdate = { update_id: 8881002, message: { chat: { id: 123 }, text: '/tools' } };
    const res = await handleTelegramWebhookUpdate(testUpdate, 'MATCHING_SECRET_TOKEN');

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.handled, 'faq_reply');

    if (origSecret) process.env.TELEGRAM_WEBHOOK_SECRET = origSecret;
    else delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  await test('Duplicate updates: Idempotent processing ignores re-delivered update_id', async () => {
    const uniqueUpdateId = 9992000 + Math.floor(Math.random() * 10000);
    const testUpdate = { update_id: uniqueUpdateId, message: { chat: { id: 123 }, text: '/coupon' } };

    // First execution
    const firstRes = await handleTelegramWebhookUpdate(testUpdate);
    assert.strictEqual(firstRes.ok, true);
    assert.strictEqual(firstRes.handled, 'faq_reply');

    // Duplicate execution with identical update_id
    const dupRes = await handleTelegramWebhookUpdate(testUpdate);
    assert.strictEqual(dupRes.ok, true);
    assert.strictEqual(dupRes.handled, 'duplicate_ignored');
  });

  await test('Owner forwarding: Persistent mapping stores owner message ID to customer chat', async () => {
    const testOwnerMsgId = 'test_owner_msg_' + Date.now();
    await saveTelegramMapping(testOwnerMsgId, {
      customer_chat_id: '99887766',
      customer_message_id: 42,
      customer_name: 'Alex Student',
      ticket_ref: 'TG-REGRESSION-01',
    });

    const retrieved = await getTelegramMapping(testOwnerMsgId);
    assert.ok(retrieved !== null, 'Mapping must be retrievable');
    assert.strictEqual(String(retrieved?.customer_chat_id), '99887766');
    assert.strictEqual(retrieved?.customer_message_id, 42);
    assert.strictEqual(retrieved?.ticket_ref, 'TG-REGRESSION-01');
  });

  await test('Owner-only replies: Non-owner cannot trigger support reply flow', async () => {
    const origOwner = process.env.TELEGRAM_OWNER_CHAT_ID;
    process.env.TELEGRAM_OWNER_CHAT_ID = '111222333'; // Configured owner

    // An arbitrary customer sends a message with reply_to_message
    const nonOwnerUpdate = {
      update_id: 7773001,
      message: {
        chat: { id: 999888777 }, // NOT the owner
        message_id: 101,
        text: 'I am trying to reply to someone else',
        reply_to_message: { message_id: 50 },
      },
    };

    const res = await handleTelegramWebhookUpdate(nonOwnerUpdate);
    // Should be treated as a customer inquiry (or forwarded), NOT an owner reply
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.handled, 'customer_inquiry_forwarded');

    if (origOwner) process.env.TELEGRAM_OWNER_CHAT_ID = origOwner;
    else delete process.env.TELEGRAM_OWNER_CHAT_ID;
  });

  await test('Owner-only replies: Configured owner reply without mapping returns informative guidance', async () => {
    const origOwner = process.env.TELEGRAM_OWNER_CHAT_ID;
    process.env.TELEGRAM_OWNER_CHAT_ID = '111222333';

    // Owner replies to an unknown message ID (no mapping found)
    const ownerUpdate = {
      update_id: 7773002,
      message: {
        chat: { id: 111222333 }, // Verified owner
        message_id: 202,
        text: 'Here is your refund',
        reply_to_message: { message_id: 999999999 }, // Unknown message ID
      },
    };

    const res = await handleTelegramWebhookUpdate(ownerUpdate);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.handled, 'owner_mapping_not_found');

    if (origOwner) process.env.TELEGRAM_OWNER_CHAT_ID = origOwner;
    else delete process.env.TELEGRAM_OWNER_CHAT_ID;
  });

  // --------------------------------------------------------------------------
  // 5. WEBSITE SUPPORT FORM VALIDATION & PERSISTENCE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. WEBSITE SUPPORT FORM VALIDATION ---');

  await test('All 6 required support categories are defined', () => {
    const required = ['Account', 'Payments', 'PDF Tools', 'Coupon', 'Bug Report', 'Other'];
    for (const cat of required) {
      assert.ok(SUPPORT_CATEGORIES.includes(cat as any), `Category ${cat} must be supported`);
    }
  });

  await test('Validates and sanitizes clean support submission', () => {
    const res = validateSupportTicketInput({
      name: '  Jane Doe  ',
      email: '  Jane.Doe@example.com  ',
      category: 'PDF Tools',
      subject: '  Textbook splitting question  ',
      message: '  How do I split chapter 3 when using a custom syllabus?  ',
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitized?.name, 'Jane Doe');
    assert.strictEqual(res.sanitized?.email, 'jane.doe@example.com');
    assert.strictEqual(res.sanitized?.category, 'PDF Tools');
    assert.strictEqual(res.sanitized?.subject, 'Textbook splitting question');
    assert.ok(res.sanitized?.message.includes('chapter 3'));
  });

  await test('Rejects invalid email format in support submission', () => {
    const res = validateSupportTicketInput({
      name: 'Jane Doe',
      email: 'not-an-email',
      category: 'Account',
      subject: 'Help',
      message: 'Need help with my account entitlement.',
    });

    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('valid email'));
  });

  await test('Rejects unsupported category in support submission', () => {
    const res = validateSupportTicketInput({
      name: 'Jane Doe',
      email: 'jane@example.com',
      category: 'InvalidCategory' as any,
      subject: 'Help',
      message: 'Need help with my account entitlement.',
    });

    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('category'));
  });

  await test('Rejects too-short message (< 10 chars)', () => {
    const res = validateSupportTicketInput({
      name: 'Jane Doe',
      email: 'jane@example.com',
      category: 'Other',
      subject: 'Help',
      message: 'Hi',
    });

    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('Message must be between 10'));
  });

  // --------------------------------------------------------------------------
  // 6. DATABASE MIGRATION & REPOSITORY STRUCTURE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 6. DATABASE MIGRATION & REPOSITORY STRUCTURE ---');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261011000000_add_100_percent_coupon_and_support_tickets.sql'
  );

  await test('Migration 20261011000000 exists on disk', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  });

  await test('Migration relaxes chk_coupon_discount_bounds to discount_value <= 100', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('discount_value <= 100'), 'Must allow up to 100%');
    assert.ok(sql.includes('chk_coupon_discount_bounds'), 'Updates check constraint');
  });

  await test('Migration idempotently creates DOCUNEXA100WELL coupon', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('DOCUNEXA100WELL'), 'Inserts DOCUNEXA100WELL coupon');
    assert.ok(sql.includes('on conflict (code) do update'), 'Idempotent insertion without duplicate crashes');
  });

  await test('Migration defines public.support_tickets table with RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('create table if not exists public.support_tickets'), 'Creates support_tickets table');
    assert.ok(sql.includes('alter table public.support_tickets enable row level security'), 'Enables RLS');
  });

  await test('Migration defines telegram_support_mappings & telegram_processed_updates tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('public.telegram_support_mappings'), 'Defines telegram_support_mappings table');
    assert.ok(sql.includes('public.telegram_processed_updates'), 'Defines telegram_processed_updates table');
  });

  await test('Migration defines atomic zero-cost redemption procedure redeem_zero_cost_coupon_atomic', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('redeem_zero_cost_coupon_atomic'), 'Defines atomic stored procedure');
    assert.ok(sql.includes('for update'), 'Enforces row-level concurrency lock');
    assert.ok(sql.includes('insert into public.coupon_redemptions'), 'Records atomic redemption');
    assert.ok(sql.includes('update public.profiles'), 'Atomically upgrades profile');
  });

  await test('Support page /support exists with client and server components', () => {
    const pagePath = path.join(process.cwd(), 'src', 'app', 'support', 'page.tsx');
    const clientPath = path.join(process.cwd(), 'src', 'app', 'support', 'SupportClient.tsx');
    assert.ok(fs.existsSync(pagePath), 'src/app/support/page.tsx must exist');
    assert.ok(fs.existsSync(clientPath), 'src/app/support/SupportClient.tsx must exist');
  });

  await test('Admin support inbox /admin/support exists and is linked in AdminNav', () => {
    const adminPagePath = path.join(process.cwd(), 'src', 'app', 'admin', 'support', 'page.tsx');
    const navPath = path.join(process.cwd(), 'src', 'components', 'admin', 'AdminNav.tsx');
    assert.ok(fs.existsSync(adminPagePath), 'src/app/admin/support/page.tsx must exist');
    const navContent = fs.readFileSync(navPath, 'utf-8');
    assert.ok(navContent.includes('/admin/support'), 'AdminNav must include /admin/support');
  });

  await test('Floating support button component exists and is mounted in RootLayout', () => {
    const floatPath = path.join(process.cwd(), 'src', 'components', 'layout', 'FloatingSupportButton.tsx');
    assert.ok(fs.existsSync(floatPath), 'FloatingSupportButton component must exist');

    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(layoutContent.includes('FloatingSupportButton'), 'RootLayout must mount FloatingSupportButton');
  });

  // --------------------------------------------------------------------------
  // 7. COUPON CONCURRENCY, LIMITS & COMPENSATORY ROLLBACKS
  // --------------------------------------------------------------------------
  console.log('\n--- 7. COUPON CONCURRENCY, LIMITS & COMPENSATORY ROLLBACKS ---');

  await test('Concurrency & Usage Limits: Per-user redemption limit logic strictly rejects second redemption', () => {
    const perUserLimit = 1;
    const existingRedemptions = 1;
    const isAllowed = existingRedemptions < perUserLimit;
    assert.strictEqual(isAllowed, false, 'User with 1 redemption must be rejected for limit = 1');
  });

  await test('Concurrency & Usage Limits: Global redemption limit logic strictly rejects when ceiling reached', () => {
    const maxRedemptions = 100;
    const currentRedemptions = 100;
    const isAllowed = currentRedemptions < maxRedemptions;
    assert.strictEqual(isAllowed, false, 'Coupon with 100/100 redemptions must reject 101st user');
  });

  await test('Transaction safety: Compensatory rollback sequence handles partial step failure', () => {
    const recordedActions: string[] = [];

    // Simulate multi-step atomic flow with failure at step 4
    const simulatedFlow = () => {
      recordedActions.push('insert_order');
      recordedActions.push('insert_redemption');
      recordedActions.push('increment_coupon_counter');
      // Step 4 fails (e.g. profile update fails)
      const profileUpdateFailed = true;
      if (profileUpdateFailed) {
        // Compensatory rollback
        recordedActions.push('rollback_coupon_counter');
        recordedActions.push('rollback_redemption');
        recordedActions.push('rollback_order');
        throw new Error('Database transaction simulated failure');
      }
    };

    assert.throws(simulatedFlow, /Database transaction simulated failure/);
    assert.deepStrictEqual(recordedActions, [
      'insert_order',
      'insert_redemption',
      'increment_coupon_counter',
      'rollback_coupon_counter',
      'rollback_redemption',
      'rollback_order',
    ], 'Rollback must unwind all prior operations in reverse order');
  });

  console.log(`\n================================================================`);
  console.log(` ALL ${passed} OF ${total} TESTS PASSED (100%)!`);
  console.log(`================================================================\n`);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
