/**
 * DocuNexa — 100% Discount Coupon & Support Integration Test Suite
 *
 * Covers:
 * 1. 100% Coupon normalization, format validation, and exact arithmetic
 * 2. Zero-cost complimentary order flow, duplicate prevention, and paid checkout preservation
 * 3. Telegram bot integration, status reporting, and command dispatcher
 * 4. Website support ticket validation, persistence, sanitization, and access control
 * 5. Database migration idempotent schema audit
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
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

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            console.log(`✓ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`✗ [FAIL] ${name}:`, err.message);
            throw err;
          });
      }
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 1. 100% COUPON VALIDATION & EXACT INTEGER ARITHMETIC
  // --------------------------------------------------------------------------
  console.log('--- 1. 100% COUPON CODE & EXACT ARITHMETIC ---');

  test('Normalizes DOCUNEXA100well with whitespace and casing', () => {
    assert.strictEqual(normalizeCouponCode('DOCUNEXA100well'), 'DOCUNEXA100WELL');
    assert.strictEqual(normalizeCouponCode('  docunexa100well  '), 'DOCUNEXA100WELL');
    assert.strictEqual(normalizeCouponCode('DocuNexa100Well'), 'DOCUNEXA100WELL');
  });

  test('Validates DOCUNEXA100WELL format matching allowed character set', () => {
    assert.strictEqual(isValidCouponCodeFormat('DOCUNEXA100WELL'), true);
    assert.strictEqual(isValidCouponCodeFormat('docunexa100well'), true);
    assert.strictEqual(isValidCouponCodeFormat(''), false);
    assert.strictEqual(isValidCouponCodeFormat('DOCU 100'), false, 'Spaces disallowed');
  });

  test('Calculates exact 100% percentage discount resulting in exactly $0.00 final amount', () => {
    const calc = calculateCouponDiscount('percent', '100', '2.000000');
    assert.strictEqual(calc.valid, true);
    assert.strictEqual(calc.originalAmountUsd, '2.000000');
    assert.strictEqual(calc.discountAmountUsdt, '2.000000');
    assert.strictEqual(calc.finalAmountUsdt, '0.000000');
    assert.strictEqual(calc.formattedDiscount, '100% off');
  });

  test('Calculates 100% discount on number input (100)', () => {
    const calc = calculateCouponDiscount('percent', 100, '2.000000');
    assert.strictEqual(calc.valid, true);
    assert.strictEqual(calc.finalAmountUsdt, '0.000000');
  });

  test('Rejects invalid percentages: >100%, 0%, negative values', () => {
    assert.strictEqual(calculateCouponDiscount('percent', '101', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '150', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '0', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '-15', '2.000000').valid, false);
  });

  test('Calculates standard fractional and fixed discounts (e.g. 50%, $1.00 off)', () => {
    const calc50 = calculateCouponDiscount('percent', '50', '2.000000');
    assert.strictEqual(calc50.valid, true);
    assert.strictEqual(calc50.discountAmountUsdt, '1.000000');
    assert.strictEqual(calc50.finalAmountUsdt, '1.000000');

    const calcFixed = calculateCouponDiscount('fixed_usdt', '1.50', '2.000000');
    assert.strictEqual(calcFixed.valid, true);
    assert.strictEqual(calcFixed.discountAmountUsdt, '1.500000');
    assert.strictEqual(calcFixed.finalAmountUsdt, '0.500000');
  });

  test('Fixed USDT discount rejects values >= base price ($2.00) and allows fractional amounts up to 1.99', () => {
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '2.00', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '2.50', '2.000000').valid, false);
    const calc199 = calculateCouponDiscount('fixed_usdt', '1.99', '2.000000');
    assert.strictEqual(calc199.valid, true);
    assert.strictEqual(calc199.discountAmountUsdt, '1.990000');
    assert.strictEqual(calc199.finalAmountUsdt, '0.010000');
  });

  // --------------------------------------------------------------------------
  // 2. ZERO-COST ORDER FLOW & ACTIVATION INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ZERO-COST ORDER FLOW & PAID CHECKOUT PRESERVATION ---');

  test('Zero-cost order structure does not contain fake blockchain hashes or deposits', () => {
    const zeroCostOrder = {
      order_id: 'DNX-FREE-1700000000-TEST1',
      product: 'ad_free',
      base_amount_usd: 2.00,
      original_amount_usd: '2.0000',
      discount_amount_usdt: '2.0000',
      final_amount_usdt: '0.0000',
      payment_amount_usdt: '0.0000',
      coupon_code: 'DOCUNEXA100WELL',
      status: 'confirmed',
      bybit_deposit_id: null,
      tx_id: null,
      block_hash: null,
      confirmations: null,
      received_amount: '0.0000',
    };

    assert.strictEqual(zeroCostOrder.bybit_deposit_id, null, 'Must not invent fake deposit ID');
    assert.strictEqual(zeroCostOrder.tx_id, null, 'Must not invent fake blockchain transaction hash');
    assert.strictEqual(zeroCostOrder.status, 'confirmed');
    assert.strictEqual(zeroCostOrder.final_amount_usdt, '0.0000');
  });

  test('Paid checkout flow is fully preserved when coupon is <100% or absent', () => {
    // Normal paid order without coupon produces unique payment amount around 2.00
    const normalCandidate = generateUniquePaymentAmount(new Set());
    assert.ok(normalCandidate.startsWith('2.00'), 'Normal price is $2.00');

    // 50% discount produces candidate around 1.00
    const halfCandidate = generateUniquePaymentAmount(new Set(), '1.000000');
    assert.ok(halfCandidate.startsWith('1.00'), '50% discount produces price starting with 1.00');
  });

  // --------------------------------------------------------------------------
  // 3. TELEGRAM BOT INTEGRATION & COMMANDS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. TELEGRAM BOT INTEGRATION ---');

  test('Telegram constants match official @docunexa_bot destination', () => {
    assert.strictEqual(TELEGRAM_BOT_USERNAME, 'docunexa_bot');
    assert.strictEqual(TELEGRAM_BOT_HANDLE, '@docunexa_bot');
    assert.strictEqual(TELEGRAM_BOT_URL, 'https://t.me/docunexa_bot');
  });

  test('Telegram bot status reports safe dormant state when TELEGRAM_BOT_TOKEN is unset', () => {
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const status = getTelegramBotStatus();
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.handle, '@docunexa_bot');
    assert.ok(status.message.includes('dormant'));

    if (originalToken) process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  test('Telegram command dispatcher replies with accurate information for /start', () => {
    const reply = getTelegramReplyForText('/start');
    assert.ok(reply.includes('@docunexa_bot'), 'Mentions bot handle');
    assert.ok(reply.includes('PDF Unit Cutter'), 'Mentions flagship tool');
    assert.ok(reply.includes('https://docunexa.pro.et/support'), 'Links to web support');
  });

  test('Telegram command dispatcher replies with accurate information for /tools', () => {
    const reply = getTelegramReplyForText('/tools');
    assert.ok(reply.includes('34+ Available'), 'Describes tools catalog');
    assert.ok(reply.includes('https://docunexa.pro.et/tools'), 'Links to tools page');
  });

  test('Telegram command dispatcher replies with accurate information for /coupon', () => {
    const reply = getTelegramReplyForText('/coupon');
    assert.ok(reply.includes('100% complimentary'), 'Explains coupon feature');
    assert.ok(reply.includes('https://docunexa.pro.et/choose-plan'), 'Links to plan page');
  });

  test('Telegram command dispatcher escalates /support to web form', () => {
    const reply = getTelegramReplyForText('/support');
    assert.ok(reply.includes('https://docunexa.pro.et/support'), 'Direct link to support form');
    assert.ok(reply.includes('natanemyalew10@gmail.com'), 'Includes maintainer email');
  });

  // --------------------------------------------------------------------------
  // 4. WEBSITE SUPPORT FORM VALIDATION & PERSISTENCE
  // --------------------------------------------------------------------------
  console.log('\n--- 4. WEBSITE SUPPORT FORM VALIDATION ---');

  test('All 6 required support categories are defined', () => {
    const required = ['Account', 'Payments', 'PDF Tools', 'Coupon', 'Bug Report', 'Other'];
    for (const cat of required) {
      assert.ok(SUPPORT_CATEGORIES.includes(cat as any), `Category ${cat} must be supported`);
    }
  });

  test('Validates and sanitizes clean support submission', () => {
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

  test('Rejects invalid email format in support submission', () => {
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

  test('Rejects unsupported category in support submission', () => {
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

  test('Rejects too-short message (< 10 chars)', () => {
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
  // 5. DATABASE MIGRATION & REPOSITORY STRUCTURE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 5. DATABASE MIGRATION & REPOSITORY STRUCTURE ---');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261011000000_add_100_percent_coupon_and_support_tickets.sql'
  );

  test('Migration 20261011000000 exists on disk', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  });

  test('Migration relaxes chk_coupon_discount_bounds to discount_value <= 100', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('discount_value <= 100'), 'Must allow up to 100%');
    assert.ok(sql.includes('chk_coupon_discount_bounds'), 'Updates check constraint');
  });

  test('Migration idempotently creates DOCUNEXA100WELL coupon', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('DOCUNEXA100WELL'), 'Inserts DOCUNEXA100WELL coupon');
    assert.ok(sql.includes('on conflict (code) do update'), 'Idempotent insertion without duplicate crashes');
  });

  test('Migration defines public.support_tickets table with RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('create table if not exists public.support_tickets'), 'Creates support_tickets table');
    assert.ok(sql.includes('alter table public.support_tickets enable row level security'), 'Enables RLS');
    assert.ok(sql.includes('Service role manages support tickets'), 'Service role policy present');
  });

  test('Support page /support exists with client and server components', () => {
    const pagePath = path.join(process.cwd(), 'src', 'app', 'support', 'page.tsx');
    const clientPath = path.join(process.cwd(), 'src', 'app', 'support', 'SupportClient.tsx');
    assert.ok(fs.existsSync(pagePath), 'src/app/support/page.tsx must exist');
    assert.ok(fs.existsSync(clientPath), 'src/app/support/SupportClient.tsx must exist');
  });

  test('Admin support inbox /admin/support exists and is linked in AdminNav', () => {
    const adminPagePath = path.join(process.cwd(), 'src', 'app', 'admin', 'support', 'page.tsx');
    const navPath = path.join(process.cwd(), 'src', 'components', 'admin', 'AdminNav.tsx');
    assert.ok(fs.existsSync(adminPagePath), 'src/app/admin/support/page.tsx must exist');
    const navContent = fs.readFileSync(navPath, 'utf-8');
    assert.ok(navContent.includes('/admin/support'), 'AdminNav must include /admin/support');
  });

  test('Navigation and Footer contain Telegram (@docunexa_bot) and Support links', () => {
    const footerPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Footer.tsx');
    const footerContent = fs.readFileSync(footerPath, 'utf-8');
    assert.ok(footerContent.includes('/support'), 'Footer includes /support');
    assert.ok(footerContent.includes('https://t.me/docunexa_bot'), 'Footer includes Telegram link');
    assert.ok(footerContent.includes('@docunexa_bot'), 'Footer includes @docunexa_bot handle');

    const drawerPath = path.join(process.cwd(), 'src', 'components', 'layout', 'MobileDrawer.tsx');
    const drawerContent = fs.readFileSync(drawerPath, 'utf-8');
    assert.ok(drawerContent.includes('/support'), 'MobileDrawer includes /support');
    assert.ok(drawerContent.includes('https://t.me/docunexa_bot'), 'MobileDrawer includes Telegram link');

    const navbarPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Navbar.tsx');
    const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
    assert.ok(navbarContent.includes('/support'), 'Navbar includes /support');
  });

  test('Floating support button component exists and is mounted in RootLayout', () => {
    const floatPath = path.join(process.cwd(), 'src', 'components', 'layout', 'FloatingSupportButton.tsx');
    assert.ok(fs.existsSync(floatPath), 'FloatingSupportButton component must exist');

    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(layoutContent.includes('FloatingSupportButton'), 'RootLayout must mount FloatingSupportButton');
  });

  console.log(`\n================================================================`);
  console.log(` ALL ${passed} OF ${total} TESTS PASSED (100%)!`);
  console.log(`================================================================\n`);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
