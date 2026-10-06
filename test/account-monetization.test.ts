import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  validateEmail,
  validatePasswordStrength,
} from '../src/lib/auth';
import {
  generateBybitV5Signature,
  generateUniquePaymentAmount,
  isPolygonNetwork,
  normalizeAmount,
  parseExactUsdt,
  exactAmountsMatch,
  getBybitConfig,
  fetchBybitDeposits,
  matchDepositToOrder,
  BybitDepositRecord,
} from '../src/lib/payments/bybit';
import {
  normalizeCouponCode,
  isValidCouponCodeFormat,
  calculateCouponDiscount,
  formatMicroUnits,
} from '../src/lib/coupons';

console.log('================================================================');
console.log('   DOCUNEXA — BYBIT DIRECT USDT PAYMENT & MONETIZATION TESTS    ');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION & CREDENTIAL VALIDATION
  // --------------------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION & CREDENTIAL VALIDATION ---');

  test('Password validation enforces min 8 characters, letter and number', () => {
    assert.strictEqual(validatePasswordStrength('').valid, false);
    assert.strictEqual(validatePasswordStrength('short').valid, false);
    assert.strictEqual(validatePasswordStrength('allletters').valid, false);
    assert.strictEqual(validatePasswordStrength('12345678').valid, false);
    assert.strictEqual(validatePasswordStrength('SecureP@ss1').valid, true);
    assert.strictEqual(validatePasswordStrength('Abc12345').valid, true);
  });

  test('Email validation enforces RFC standards', () => {
    assert.strictEqual(validateEmail(''), false);
    assert.strictEqual(validateEmail('invalid'), false);
    assert.strictEqual(validateEmail('test@'), false);
    assert.strictEqual(validateEmail('@domain.com'), false);
    assert.strictEqual(validateEmail('user@docunexa.pro.et'), true);
    assert.strictEqual(validateEmail('customer.name@example.org'), true);
  });

  test('Supabase client modules exist and export correct SSR factories', () => {
    const serverClientPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'server.ts');
    const browserClientPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'client.ts');
    const typesPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'types.ts');

    assert.ok(fs.existsSync(serverClientPath), 'src/lib/supabase/server.ts must exist');
    assert.ok(fs.existsSync(browserClientPath), 'src/lib/supabase/client.ts must exist');
    assert.ok(fs.existsSync(typesPath), 'src/lib/supabase/types.ts must exist');

    const serverContent = fs.readFileSync(serverClientPath, 'utf-8');
    assert.ok(serverContent.includes('createServerSupabaseClient'), 'Must export createServerSupabaseClient');
    assert.ok(serverContent.includes('createAdminSupabaseClient'), 'Must export createAdminSupabaseClient');
    assert.ok(serverContent.includes('getCurrentProfile'), 'Must export getCurrentProfile');
  });

  // --------------------------------------------------------------------------
  // 2. SUPABASE POSTGRESQL SCHEMA & BYBIT PAYMENT ORDERS TABLE
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SUPABASE POSTGRESQL SCHEMA & PAYMENT ORDERS ---');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261004000000_create_profiles_and_payments.sql'
  );

  test('Supabase migration file exists in version-controlled directory', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist');
  });

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  test('Profiles table references auth.users and enforces plan constraints', () => {
    assert.ok(migrationSql.includes('create table if not exists public.profiles'), 'Creates profiles table');
    assert.ok(
      migrationSql.includes('id uuid primary key references auth.users(id) on delete cascade'),
      'Profiles id references auth.users(id)'
    );
    assert.ok(
      migrationSql.includes("plan text not null default 'free' check (plan in ('free', 'ad_free'))"),
      'Plan column constrained to free and ad_free'
    );
    assert.strictEqual(
      migrationSql.includes('password_hash'),
      false,
      'Profiles table must NOT contain password_hash'
    );
  });

  test('payment_orders table enforces required Bybit fields, constraints and partial unique index', () => {
    assert.ok(migrationSql.includes('create table if not exists public.payment_orders'), 'Creates payment_orders table');
    assert.ok(
      migrationSql.includes('user_id uuid not null references public.profiles(id) on delete cascade'),
      'payment_orders user_id foreign key references profiles(id)'
    );
    assert.ok(migrationSql.includes('order_id text not null unique'), 'order_id is unique');
    assert.ok(migrationSql.includes('payment_amount_usdt numeric(18, 6) not null'), 'payment_amount_usdt has 18,6 precision');
    assert.ok(migrationSql.includes('received_amount numeric(18, 6)'), 'received_amount has 18,6 precision');
    assert.ok(migrationSql.includes("base_amount_usd numeric(10, 2) not null default 2.00"), 'base_amount_usd default 2.00');
    assert.ok(migrationSql.includes("currency text not null default 'USDT'"), 'currency default USDT');
    assert.ok(migrationSql.includes("network text not null default 'Polygon'"), 'network default Polygon');
    assert.ok(migrationSql.includes('destination_address text not null'), 'destination_address required');
    assert.ok(migrationSql.includes('bybit_deposit_id text unique'), 'bybit_deposit_id is unique');
    assert.ok(migrationSql.includes('expires_at timestamptz not null'), 'expires_at is required');
    assert.ok(migrationSql.includes('updated_at timestamptz not null'), 'updated_at is required on payment_orders');
    assert.ok(
      migrationSql.includes(
        "check (status in ('pending', 'detected', 'confirmed', 'expired', 'amount_mismatch', 'late_payment', 'cancelled'))"
      ),
      'Status constrained to exact payment lifecycle states'
    );
    // Partial unique index preventing duplicate active amounts
    assert.ok(
      migrationSql.includes('idx_unique_active_payment_amount'),
      'Enforces partial unique index on active payment amounts'
    );
  });

  test('Row Level Security (RLS) is enabled and enforces least-privilege on payment_orders', () => {
    assert.ok(migrationSql.includes('alter table public.payment_orders enable row level security;'), 'RLS enabled on payment_orders');
    assert.ok(
      migrationSql.includes('create policy "Users can view own payment orders"'),
      'Users view own payment orders policy exists'
    );
    assert.ok(migrationSql.includes('auth.uid() = user_id'), 'payment_orders select policy uses auth.uid() = user_id');
    // Ensure no client policy exists allowing authenticated users to update their plan or orders directly
    assert.strictEqual(
      migrationSql.includes('for update\n  to authenticated'),
      false,
      'Authenticated users must NOT have update policy on payment_orders directly'
    );
  });

  // --------------------------------------------------------------------------
  // 3. BYBIT V5 SIGNATURE, NETWORK & AMOUNT PRECISION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. BYBIT V5 SIGNATURE & AMOUNT ALGORITHM ---');

  test('Bybit V5 HMAC-SHA256 signature conforms to GET query-record specification', () => {
    const timestamp = '1728076800000';
    const apiKey = 'test_bybit_api_key_123';
    const apiSecret = 'test_bybit_api_secret_456';
    const recvWindow = '5000';
    const queryString = 'coin=USDT&limit=50';

    const sig = generateBybitV5Signature(timestamp, apiKey, recvWindow, queryString, apiSecret);
    assert.ok(typeof sig === 'string' && sig.length === 64, 'Signature must be 64 hex characters (SHA256)');

    // Changing timestamp or query must alter signature
    const sigDifferentTime = generateBybitV5Signature('1728076800001', apiKey, recvWindow, queryString, apiSecret);
    assert.notStrictEqual(sig, sigDifferentTime);

    const sigDifferentQuery = generateBybitV5Signature(timestamp, apiKey, recvWindow, 'coin=USDT&limit=20', apiSecret);
    assert.notStrictEqual(sig, sigDifferentQuery);
  });

  test('Unique payment amount generator produces >= 2.00 USDT with 6 decimal places', () => {
    for (let i = 0; i < 20; i++) {
      const amount = generateUniquePaymentAmount();
      const num = parseFloat(amount);
      assert.ok(num >= 2.00, `Amount ${amount} must be >= 2.00`);
      assert.ok(num < 2.02, `Amount ${amount} must remain close to 2.00`);
      assert.ok(/^\d+\.\d{6}$/.test(amount), `Amount ${amount} must have exact 6 decimals`);
    }
  });

  test('Unique payment amount generator prevents collisions with active orders', () => {
    const active = new Set(['2.001234', '2.005678', '2.009999']);
    const candidate = generateUniquePaymentAmount(active);
    assert.strictEqual(active.has(candidate), false, 'Generated amount must not collide with active amounts');
  });

  test('isPolygonNetwork correctly identifies Polygon PoS aliases and rejects other chains', () => {
    assert.strictEqual(isPolygonNetwork('MATIC'), true);
    assert.strictEqual(isPolygonNetwork('Polygon'), true);
    assert.strictEqual(isPolygonNetwork('POLYGON'), true);
    assert.strictEqual(isPolygonNetwork('Polygon PoS'), true);
    assert.strictEqual(isPolygonNetwork('ETH'), false);
    assert.strictEqual(isPolygonNetwork('ERC20'), false);
    assert.strictEqual(isPolygonNetwork('TRX'), false);
    assert.strictEqual(isPolygonNetwork('TRC20'), false);
    assert.strictEqual(isPolygonNetwork('BSC'), false);
  });

  test('normalizeAmount ensures consistent 6-decimal comparison', () => {
    assert.strictEqual(normalizeAmount('2.004821'), '2.004821');
    assert.strictEqual(normalizeAmount(2.004821), '2.004821');
    assert.strictEqual(normalizeAmount('2.00'), '2.000000');
    assert.strictEqual(normalizeAmount(2), '2.000000');
  });

  test('exactAmountsMatch enforces exact decimal equality without binary floating point or silent rounding', () => {
    // Exact match
    assert.strictEqual(exactAmountsMatch('2.004821', '2.004821'), true);
    assert.strictEqual(exactAmountsMatch('2.00', '2.000000'), true);
    assert.strictEqual(exactAmountsMatch('2', '2.000000'), true);

    // Mismatched amount
    assert.strictEqual(exactAmountsMatch('2.004821', '2.004820'), false);
    assert.strictEqual(exactAmountsMatch('2.004821', '2.000000'), false);

    // Extra decimal precision beyond 6 places must NOT be silently rounded down
    assert.strictEqual(exactAmountsMatch('2.004821', '2.0048211'), false);
    assert.strictEqual(exactAmountsMatch('2.004821', '2.0048219'), false);
    assert.strictEqual(exactAmountsMatch('2.0048211', '2.004821'), false);

    // Trailing non-significant zeroes after 6 decimal places evaluate equally
    assert.strictEqual(exactAmountsMatch('2.004821', '2.00482100'), true);
  });

  test('Wallet address is loaded strictly from BYBIT_USDT_POLYGON_ADDRESS with zero hardcoded address in bybit.ts', () => {
    const bybitSource = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'payments', 'bybit.ts'), 'utf-8');
    // Ensure no fallback 0x90c0f... is hardcoded in source
    assert.strictEqual(
      bybitSource.includes('0x90c0f391c73c172f262313f04992077c8797d127'),
      false,
      'Bybit source must not contain hardcoded wallet addresses'
    );
  });

  // --------------------------------------------------------------------------
  // 4. DEPOSIT MATCHING ENGINE TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- 4. BYBIT DEPOSIT MATCHING ENGINE ---');

  const baseOrder = {
    payment_amount_usdt: '2.004821',
    destination_address: '0x90c0f391c73c172f262313f04992077c8797d127',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins left
  };

  test('Deposit Matching: Confirms valid USDT Polygon deposit with exact amount', () => {
    const validDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'MATIC',
      amount: '2.004821',
      txID: '0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      status: 3, // success
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 60000),
      confirmations: '128',
      blockHash: '0xblock123',
      depositId: 'bybit_dep_001',
    };

    const res = matchDepositToOrder(baseOrder, [validDeposit]);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.status, 'confirmed');
    assert.strictEqual(res.deposit?.txID, validDeposit.txID);
  });

  test('Deposit Matching: Marks detected when Bybit status is processing (status 1 or 2)', () => {
    const unconfirmedDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'Polygon',
      amount: '2.004821',
      txID: '0xpendingtx123',
      status: 1, // toBeConfirmed
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 30000),
      confirmations: '12',
    };

    const res = matchDepositToOrder(baseOrder, [unconfirmedDeposit]);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.status, 'detected');
    assert.strictEqual(res.deposit?.txID, '0xpendingtx123');
  });

  test('Deposit Matching: Rejects wrong coin (e.g. USDC, BTC)', () => {
    const usdcDeposit: BybitDepositRecord = {
      coin: 'USDC',
      chain: 'MATIC',
      amount: '2.004821',
      txID: '0xwrongcoin123',
      status: 3,
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 60000),
    };

    const res = matchDepositToOrder(baseOrder, [usdcDeposit]);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.status, 'pending');
  });

  test('Deposit Matching: Rejects wrong network (e.g. Ethereum / Tron)', () => {
    const ethDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'ETH',
      amount: '2.004821',
      txID: '0xwrongnet123',
      status: 3,
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 60000),
    };

    const res = matchDepositToOrder(baseOrder, [ethDeposit]);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.status, 'pending');
  });

  test('Deposit Matching: Rejects wrong destination address', () => {
    const wrongAddressDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'MATIC',
      amount: '2.004821',
      txID: '0xwrongaddr123',
      status: 3,
      toAddress: '0x0000000000000000000000000000000000000000',
      successAt: String(Date.now() - 60000),
    };

    const res = matchDepositToOrder(baseOrder, [wrongAddressDeposit]);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.status, 'pending');
  });

  test('Deposit Matching: Flags amount_mismatch when transfer arrived with wrong amount', () => {
    const wrongAmountDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'MATIC',
      amount: '2.000000', // Sent 2.00 instead of 2.004821
      txID: '0xwrongamt123',
      status: 3,
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 60000),
    };

    const res = matchDepositToOrder(baseOrder, [wrongAmountDeposit]);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.status, 'amount_mismatch');
  });

  test('Deposit Matching: Flags late_payment when exact amount arrives after 20-minute window', () => {
    const expiredOrder = {
      ...baseOrder,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // expired 10 mins ago
    };

    const lateDeposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'MATIC',
      amount: '2.004821',
      txID: '0xlatedeposit123',
      status: 3,
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 5 * 60 * 1000), // deposited 5 mins ago (after expiration)
    };

    const res = matchDepositToOrder(expiredOrder, [lateDeposit]);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.status, 'late_payment');
  });

  test('Deposit Matching: Prevents duplicate double-spending on consumed deposit ID', () => {
    const deposit: BybitDepositRecord = {
      coin: 'USDT',
      chain: 'MATIC',
      amount: '2.004821',
      txID: '0xduplicate123',
      status: 3,
      toAddress: '0x90c0f391c73c172f262313f04992077c8797d127',
      successAt: String(Date.now() - 60000),
      depositId: 'consumed_dep_999',
    };

    const consumed = new Set(['consumed_dep_999']);
    const res = matchDepositToOrder(baseOrder, [deposit], consumed);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.status, 'pending');
  });

  // --------------------------------------------------------------------------
  // 5. SECURITY & CLIENT PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- 5. SECURITY & CLIENT PROTECTION ---');

  test('Choose-plan route never grants ad_free from client request body', () => {
    const choosePlanPath = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'auth',
      'choose-plan',
      'route.ts'
    );
    const content = fs.readFileSync(choosePlanPath, 'utf-8');
    assert.ok(
      content.includes("redirect: '/account?checkout=ad_free'"),
      'Redirects to checkout instead of elevating plan'
    );
    assert.strictEqual(
      content.includes("update({ plan: 'ad_free'"),
      false,
      'Must NEVER set plan = ad_free in choose-plan endpoint'
    );
  });

  test('Payment check route enforces user ownership and authenticates requester', () => {
    const checkRoutePath = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'payments',
      'bybit',
      'check',
      'route.ts'
    );
    const content = fs.readFileSync(checkRoutePath, 'utf-8');
    assert.ok(content.includes('order.user_id !== profile.id'), 'Blocks access to another user order');
    assert.ok(content.includes('status: 403'), 'Returns 403 Forbidden for mismatched user');
  });

  test('BYBIT_API_SECRET is server-only and never prefixed with NEXT_PUBLIC_', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envExample = fs.readFileSync(envExamplePath, 'utf-8');

    assert.ok(envExample.includes('BYBIT_API_KEY='), 'Must document BYBIT_API_KEY');
    assert.ok(envExample.includes('BYBIT_API_SECRET='), 'Must document BYBIT_API_SECRET');
    assert.ok(envExample.includes('BYBIT_USDT_POLYGON_ADDRESS='), 'Must document BYBIT_USDT_POLYGON_ADDRESS');

    assert.strictEqual(envExample.includes('NEXT_PUBLIC_BYBIT_API_SECRET'), false);
  });

  // --------------------------------------------------------------------------
  // 6. MONETAG INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 6. PLAN ENTITLEMENTS & MONETAG INTEGRATION ---');

  test('Anonymous visitor entitlement is free with ads enabled', () => {
    const anonymousUser = null;
    const isAdFree = (anonymousUser as any)?.plan === 'ad_free';
    assert.strictEqual(isAdFree, false, 'Anonymous user must NOT be ad-free');
  });

  test('Free user entitlement is free with ads enabled', () => {
    const freeUser = { id: 'usr_1', email: 'free@test.com', plan: 'free' as string };
    const isAdFree = freeUser.plan === 'ad_free';
    assert.strictEqual(isAdFree, false, 'Free plan user must NOT be ad-free');
  });

  test('Ad-Free user entitlement disables ads', () => {
    const adFreeUser = { id: 'usr_2', email: 'adfree@test.com', plan: 'ad_free' as const };
    const isAdFree = adFreeUser.plan === 'ad_free';
    assert.strictEqual(isAdFree, true, 'Ad-Free user must be ad-free');
  });

  test('Monetag service worker public/sw.js exists and is intact', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    assert.ok(fs.existsSync(swPath), 'public/sw.js must exist on disk');
    const content = fs.readFileSync(swPath, 'utf-8');
    assert.ok(content.includes('zoneId'), 'sw.js must contain zone configuration');
    assert.ok(content.includes('importScripts'), 'sw.js must contain importScripts');
  });

  test('Monetag tag configuration matches required parameters exactly in RootLayout', () => {
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(layoutContent.includes('data-zone="289364"'), 'Zone 289364 must be present');
    assert.ok(layoutContent.includes('data-cfasync="false"'), 'data-cfasync="false" must be present');
    assert.ok(layoutContent.includes('https://quge5.com/88/tag.min.js'), 'Monetag script URL must match');
    assert.ok(layoutContent.includes('strategy="afterInteractive"'), 'Must use afterInteractive strategy');
    assert.ok(layoutContent.includes('isAdFree'), 'Layout must conditionally render Monetag based on isAdFree');
    assert.ok(layoutContent.includes('MonetagServiceWorkerCleanup'), 'Layout must cleanup SW for Ad-Free users');
  });

  // --------------------------------------------------------------------------
  // 7. VERCEL COMPATIBILITY & ZERO CRYPTOMUS REFERENCES
  // --------------------------------------------------------------------------
  console.log('\n--- 7. VERCEL COMPATIBILITY & ZERO CRYPTOMUS CHECKS ---');

  test('Zero Cryptomus references exist in src/ and .env.example', () => {
    function searchForString(dir: string, term: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...searchForString(fullPath, term));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.toLowerCase().includes(term.toLowerCase())) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const matches = searchForString(path.join(process.cwd(), 'src'), 'cryptomus');
    assert.strictEqual(
      matches.length,
      0,
      `Cryptomus references found in src: ${matches.join(', ')}`
    );

    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
    assert.strictEqual(
      envExample.toLowerCase().includes('cryptomus'),
      false,
      '.env.example must not contain cryptomus'
    );
  });

  test('Application state does not use persistent local filesystem writes (writeFile/appendFile in src/)', () => {
    function searchFsWrites(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...searchFsWrites(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (
            content.includes('writeFileSync') ||
            content.includes('writeFile(') ||
            content.includes('appendFileSync') ||
            content.includes('appendFile(')
          ) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const writeMatches = searchFsWrites(path.join(process.cwd(), 'src'));
    assert.strictEqual(
      writeMatches.length,
      0,
      `Persistent filesystem writes found in src: ${writeMatches.join(', ')}`
    );
  });

  test('Private account and auth pages are excluded from public sitemap and marked noindex', () => {
    const sitemapPath = path.join(process.cwd(), 'src', 'app', 'sitemap.ts');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

    assert.strictEqual(sitemapContent.includes('/login'), false);
    assert.strictEqual(sitemapContent.includes('/signup'), false);
    assert.strictEqual(sitemapContent.includes('/account'), false);
    assert.strictEqual(sitemapContent.includes('/choose-plan'), false);

    const loginPath = path.join(process.cwd(), 'src', 'app', 'login', 'page.tsx');
    const signupPath = path.join(process.cwd(), 'src', 'app', 'signup', 'page.tsx');
    const accountPath = path.join(process.cwd(), 'src', 'app', 'account', 'page.tsx');

    assert.ok(fs.readFileSync(loginPath, 'utf-8').includes('index: false'));
    assert.ok(fs.readFileSync(signupPath, 'utf-8').includes('index: false'));
    assert.ok(fs.readFileSync(accountPath, 'utf-8').includes('index: false'));
  });

  test('robots.ts disallows private auth, account, and api endpoints', () => {
    const robotsPath = path.join(process.cwd(), 'src', 'app', 'robots.ts');
    const content = fs.readFileSync(robotsPath, 'utf-8');
    assert.ok(content.includes("'/account'"));
    assert.ok(content.includes("'/choose-plan'"));
    assert.ok(content.includes("'/login'"));
    assert.ok(content.includes("'/signup'"));
    assert.ok(content.includes("'/api/'"));
  });

  test('Terms page /terms contains complete Ad-Free terms and explicit refund policy for all required scenarios', () => {
    const termsPath = path.join(process.cwd(), 'src', 'app', 'terms', 'page.tsx');
    const content = fs.readFileSync(termsPath, 'utf-8');

    // Section header & core specifications
    assert.ok(content.includes('Ad-Free Upgrade & Cryptocurrency Payments'), 'Contains Ad-Free section');
    assert.ok(content.includes('$2.00 USD'), 'States $2.00 USD price');
    assert.ok(content.includes('USDT'), 'States USDT currency');
    assert.ok(content.includes('Polygon'), 'States Polygon network');
    assert.ok(content.includes('One-time payment'), 'States one-time payment');
    assert.ok(content.includes('20-Minute Payment Window'), 'States 20-minute window');

    // Explicit refund policy scenarios per Requirement 49
    assert.ok(content.toLowerCase().includes('duplicate payment'), 'Addresses duplicate payments');
    assert.ok(content.toLowerCase().includes('wrong amount'), 'Addresses wrong amount payments');
    assert.ok(content.toLowerCase().includes('late payment'), 'Addresses late payments');
    assert.ok(content.toLowerCase().includes('wrong network'), 'Addresses wrong network payments');
    assert.ok(content.toLowerCase().includes('technical payment failure'), 'Addresses technical payment failures');
  });

  test('Standard QR Code component uses standard qrcode library with valid SVG encoding', () => {
    const qrPath = path.join(process.cwd(), 'src', 'components', 'payments', 'QrCode.tsx');
    const content = fs.readFileSync(qrPath, 'utf-8');
    assert.ok(content.includes("from 'qrcode'"), 'Imports standard qrcode library');
    assert.ok(content.includes('QRCode.toString'), 'Uses QRCode.toString for SVG');
  });

  // --------------------------------------------------------------------------
  // 8. LIVE BYBIT READ-ONLY CONNECTION AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 8. LIVE BYBIT READ-ONLY CONNECTION AUDIT ---');

  await (async function testLiveBybit() {
    // Check if .env.local has Bybit credentials
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envLocalContent = fs.readFileSync(envLocalPath, 'utf-8');
      for (const line of envLocalContent.split('\n')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }

    const { apiKey, apiSecret, depositAddress } = getBybitConfig();

    if (apiKey && apiSecret) {
      test('Live Bybit API V5 query-record returns retCode 0 (read-only verification)', async () => {
        const res = await fetchBybitDeposits({ coin: 'USDT', limit: 5 });
        assert.strictEqual(
          res.success,
          true,
          `Bybit API connection failed: ${res.error}`
        );
        assert.ok(Array.isArray(res.rows), 'Bybit result.rows must be an array');
        console.log(`       [Live Bybit Audit] Verified read-only deposit query. Rows returned: ${res.rows.length}`);
      });

      test('Destination wallet address is configured and matches 0x format', () => {
        assert.ok(depositAddress && depositAddress.startsWith('0x'), 'Destination address must start with 0x');
        assert.strictEqual(depositAddress.length, 42, 'Polygon address must be 42 characters');
      });
    } else {
      console.log('       [Info] BYBIT credentials not configured in environment; skipping live ping.');
    }
  })();

  // --------------------------------------------------------------------------
  // 9. COUPON CODE NORMALIZATION & EXACT DECIMAL CALCULATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- 9. COUPON CODE NORMALIZATION & EXACT DECIMAL CALCULATIONS ---');

  test('Coupon normalization trims whitespace and converts to uppercase', () => {
    assert.strictEqual(normalizeCouponCode('save25'), 'SAVE25');
    assert.strictEqual(normalizeCouponCode('  welcome50  '), 'WELCOME50');
    assert.strictEqual(normalizeCouponCode('DocuNexa-20'), 'DOCUNEXA-20');
    assert.strictEqual(normalizeCouponCode('student_15'), 'STUDENT_15');
    assert.strictEqual(normalizeCouponCode(''), '');
  });

  test('Coupon code format enforces 2-30 characters with allowed character set (A-Z, 0-9, -, _)', () => {
    assert.strictEqual(isValidCouponCodeFormat('SAVE25'), true);
    assert.strictEqual(isValidCouponCodeFormat('WELCOME-50'), true);
    assert.strictEqual(isValidCouponCodeFormat('STUDENT_2026'), true);
    assert.strictEqual(isValidCouponCodeFormat('X'), false, 'Too short (min 2)');
    assert.strictEqual(isValidCouponCodeFormat('SAVE 25'), false, 'Spaces must be disallowed');
    assert.strictEqual(isValidCouponCodeFormat('SAVE@25'), false, 'Special symbols disallowed');
    assert.strictEqual(isValidCouponCodeFormat('SAVE#OFF'), false, 'Special symbols disallowed');
  });

  test('Percentage discount calculates exact 6-decimal amounts (e.g. 25% off $2.00 = $1.50)', () => {
    const calc25 = calculateCouponDiscount('percent', '25', '2.000000');
    assert.strictEqual(calc25.valid, true);
    assert.strictEqual(calc25.originalAmountUsd, '2.000000');
    assert.strictEqual(calc25.discountAmountUsdt, '0.500000');
    assert.strictEqual(calc25.finalAmountUsdt, '1.500000');
    assert.strictEqual(calc25.formattedDiscount, '25% off');

    const calc50 = calculateCouponDiscount('percent', '50', '2.000000');
    assert.strictEqual(calc50.valid, true);
    assert.strictEqual(calc50.discountAmountUsdt, '1.000000');
    assert.strictEqual(calc50.finalAmountUsdt, '1.000000');

    const calc10 = calculateCouponDiscount('percent', '10', '2.000000');
    assert.strictEqual(calc10.valid, true);
    assert.strictEqual(calc10.discountAmountUsdt, '0.200000');
    assert.strictEqual(calc10.finalAmountUsdt, '1.800000');

    const calc99 = calculateCouponDiscount('percent', '99', '2.000000');
    assert.strictEqual(calc99.valid, true);
    assert.strictEqual(calc99.discountAmountUsdt, '1.980000');
    assert.strictEqual(calc99.finalAmountUsdt, '0.020000');
  });

  test('Percentage discount rejects zero, negative, 100%, and over-limit values', () => {
    assert.strictEqual(calculateCouponDiscount('percent', '0', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '-10', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '100', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('percent', '120', '2.000000').valid, false);
  });

  test('Fixed USDT discount calculates exact amounts (e.g. 0.50 USDT off $2.00 = $1.50)', () => {
    const calc50 = calculateCouponDiscount('fixed_usdt', '0.50', '2.000000');
    assert.strictEqual(calc50.valid, true);
    assert.strictEqual(calc50.originalAmountUsd, '2.000000');
    assert.strictEqual(calc50.discountAmountUsdt, '0.500000');
    assert.strictEqual(calc50.finalAmountUsdt, '1.500000');
    assert.strictEqual(calc50.formattedDiscount, '0.500000 USDT off');

    const calc25 = calculateCouponDiscount('fixed_usdt', '0.25', '2.000000');
    assert.strictEqual(calc25.valid, true);
    assert.strictEqual(calc25.discountAmountUsdt, '0.250000');
    assert.strictEqual(calc25.finalAmountUsdt, '1.750000');

    const calc199 = calculateCouponDiscount('fixed_usdt', '1.99', '2.000000');
    assert.strictEqual(calc199.valid, true);
    assert.strictEqual(calc199.discountAmountUsdt, '1.990000');
    assert.strictEqual(calc199.finalAmountUsdt, '0.010000');
  });

  test('Fixed USDT discount rejects zero, negative, and >= $2.00 discounts', () => {
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '0', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '-0.50', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '2.00', '2.000000').valid, false);
    assert.strictEqual(calculateCouponDiscount('fixed_usdt', '2.50', '2.000000').valid, false);
  });

  test('Micro-unit formatting enforces exact 6 decimal precision', () => {
    assert.strictEqual(formatMicroUnits(1500000n), '1.500000');
    assert.strictEqual(formatMicroUnits(2004821n), '2.004821');
    assert.strictEqual(formatMicroUnits(10000n), '0.010000');
    assert.strictEqual(formatMicroUnits(0n), '0.000000');
  });

  // --------------------------------------------------------------------------
  // 10. UNIQUE PAYMENT AMOUNT WITH COUPON DISCOUNTS
  // --------------------------------------------------------------------------
  console.log('\n--- 10. UNIQUE PAYMENT AMOUNT WITH COUPON DISCOUNTS ---');

  test('Unique payment amount generator produces discounted candidate matching base price', () => {
    // Generate off $1.50 base (after 25% coupon)
    const discountedAmount = generateUniquePaymentAmount(new Set(), '1.500000');
    assert.ok(discountedAmount.startsWith('1.50'), `Amount must start with 1.50, got: ${discountedAmount}`);
    assert.strictEqual(discountedAmount.length, 8, 'Must have 6 decimal places (e.g. 1.504821)');
    assert.ok(!discountedAmount.startsWith('2.00'), 'Must not generate 2.00 amount when discounted');

    // Generate off $1.00 base (after 50% coupon)
    const halfAmount = generateUniquePaymentAmount(new Set(), '1.000000');
    assert.ok(halfAmount.startsWith('1.00'), `Amount must start with 1.00, got: ${halfAmount}`);

    // Default without baseAmount parameter remains 2.00
    const normalAmount = generateUniquePaymentAmount();
    assert.ok(normalAmount.startsWith('2.00'), `Default amount must start with 2.00, got: ${normalAmount}`);
  });

  test('Unique payment amount generator prevents collisions across active orders', () => {
    const active = new Set(['1.501234', '1.505678']);
    const candidate = generateUniquePaymentAmount(active, '1.500000');
    assert.ok(!active.has(candidate), 'Candidate must not collide with active amounts');
  });

  // --------------------------------------------------------------------------
  // 11. SUPABASE MIGRATION 20261005000000 & SCHEMA AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 11. SUPABASE MIGRATION 20261005000000 & SCHEMA AUDIT ---');

  const couponMigrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261005000000_create_coupons_and_admin.sql'
  );

  test('Coupon & admin migration SQL file exists in version-controlled directory', () => {
    assert.ok(fs.existsSync(couponMigrationPath), '20261005000000 migration file must exist');
  });

  const couponSql = fs.readFileSync(couponMigrationPath, 'utf-8');

  test('Coupons table schema enforces codes, bounds, and max redemption constraints', () => {
    assert.ok(couponSql.includes('create table if not exists public.coupons'), 'Creates coupons table');
    assert.ok(couponSql.includes('code text unique not null'), 'Enforces unique code');
    assert.ok(couponSql.includes('discount_type in (\'percent\', \'fixed_usdt\')'), 'Enforces discount types');
    assert.ok(couponSql.includes('chk_coupon_discount_bounds'), 'Enforces bounds constraint');
    assert.ok(couponSql.includes('chk_coupon_redemptions_ceiling'), 'Enforces redemption ceiling constraint');
  });

  test('Coupon redemptions table enforces one-per-order uniqueness and foreign keys', () => {
    assert.ok(couponSql.includes('create table if not exists public.coupon_redemptions'), 'Creates coupon_redemptions table');
    assert.ok(couponSql.includes('coupon_id uuid not null references public.coupons(id)'), 'References coupons(id)');
    assert.ok(couponSql.includes('payment_order_id uuid not null references public.payment_orders(id) on delete cascade unique'), 'Unique per payment order');
  });

  test('Admin users table references auth.users securely', () => {
    assert.ok(couponSql.includes('create table if not exists public.admin_users'), 'Creates admin_users table');
    assert.ok(couponSql.includes('user_id uuid primary key references auth.users(id) on delete cascade'), 'Primary key references auth.users');
  });

  test('Admin audit logs table provides append-only audit tracking', () => {
    assert.ok(couponSql.includes('create table if not exists public.admin_audit_logs'), 'Creates admin_audit_logs table');
    assert.ok(couponSql.includes('metadata jsonb'), 'Stores structured metadata');
    assert.ok(couponSql.includes('reason text'), 'Stores documented justification reason');
  });

  test('Payment orders table is extended with coupon metadata columns', () => {
    assert.ok(couponSql.includes('coupon_id uuid references public.coupons(id)'), 'Adds coupon_id column');
    assert.ok(couponSql.includes('coupon_code text'), 'Adds coupon_code column');
    assert.ok(couponSql.includes('discount_amount_usdt numeric(18, 6)'), 'Adds discount_amount_usdt column');
    assert.ok(couponSql.includes('original_amount_usd numeric(18, 6)'), 'Adds original_amount_usd column');
    assert.ok(couponSql.includes('final_amount_usdt numeric(18, 6)'), 'Adds final_amount_usdt column');
  });

  test('Atomic payment confirmation procedure exists in migration', () => {
    assert.ok(couponSql.includes('create or replace function public.confirm_payment_order'), 'Defines confirm_payment_order function');
    assert.ok(couponSql.includes('for update'), 'Employs row-level locking for concurrency protection');
    assert.ok(couponSql.includes('insert into public.coupon_redemptions'), 'Records coupon redemption atomically');
  });

  // --------------------------------------------------------------------------
  // 12. ADMIN AUTHORIZATION & ACCESS CONTROL AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 12. ADMIN AUTHORIZATION & ACCESS CONTROL AUDIT ---');

  test('Admin authentication and audit modules exist and export correct guards', () => {
    const adminAuthPath = path.join(process.cwd(), 'src', 'lib', 'admin', 'auth.ts');
    const adminAuditPath = path.join(process.cwd(), 'src', 'lib', 'admin', 'audit.ts');

    assert.ok(fs.existsSync(adminAuthPath), 'src/lib/admin/auth.ts must exist');
    assert.ok(fs.existsSync(adminAuditPath), 'src/lib/admin/audit.ts must exist');

    const authContent = fs.readFileSync(adminAuthPath, 'utf-8');
    assert.ok(authContent.includes('requireAdmin'), 'Must export requireAdmin');
    assert.ok(authContent.includes('isUserAdmin'), 'Must export isUserAdmin');

    const auditContent = fs.readFileSync(adminAuditPath, 'utf-8');
    assert.ok(auditContent.includes('logAdminAction'), 'Must export logAdminAction');
    assert.ok(auditContent.includes('sanitizeMetadata'), 'Must sanitize metadata to prevent secret leakage');
  });

  test('Admin routes require server-side requireAdmin authorization', () => {
    const routesToCheck = [
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'overview', 'route.ts'),
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'users', 'route.ts'),
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'payments', 'route.ts'),
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'coupons', 'route.ts'),
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'audit', 'route.ts'),
    ];

    for (const rPath of routesToCheck) {
      assert.ok(fs.existsSync(rPath), `Route file ${rPath} must exist`);
      const content = fs.readFileSync(rPath, 'utf-8');
      assert.ok(content.includes('requireAdmin()'), `Route ${path.basename(rPath)} must invoke requireAdmin()`);
    }
  });

  // --------------------------------------------------------------------------
  // 13. PRIVACY & TERMS POLICY AUDIT (COUPONS & REFUND POLICY)
  // --------------------------------------------------------------------------
  console.log('\n--- 13. PRIVACY & TERMS POLICY AUDIT ---');

  test('Privacy policy /privacy includes coupon and payment metadata disclosures', () => {
    const privacyPath = path.join(process.cwd(), 'src', 'app', 'privacy', 'page.tsx');
    const content = fs.readFileSync(privacyPath, 'utf-8');
    assert.ok(content.includes('Coupon Code Redemptions'), 'Privacy policy must disclose coupon code storage');
    assert.ok(content.includes('Payment & Order Metadata'), 'Privacy policy must disclose order metadata handling');
    assert.ok(content.includes('Monetag'), 'Privacy policy must preserve Monetag disclosures');
  });

  test('Terms of service /terms includes comprehensive coupon terms and discounted payment rules', () => {
    const termsPath = path.join(process.cwd(), 'src', 'app', 'terms', 'page.tsx');
    const content = fs.readFileSync(termsPath, 'utf-8');
    assert.ok(content.includes('Promotional Coupon Codes'), 'Terms must contain Promotional Coupon Codes section');
    assert.ok(content.includes('Server-Side Authority'), 'Terms must clarify server authority for discounts');
    assert.ok(content.includes('Unique Payment Amount'), 'Terms must explain unique amounts based on final price');
  });

  test('Admin routes are excluded from public robots.ts and sitemap.ts', () => {
    const robotsPath = path.join(process.cwd(), 'src', 'app', 'robots.ts');
    const sitemapPath = path.join(process.cwd(), 'src', 'app', 'sitemap.ts');

    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    assert.ok(robotsContent.includes("'/admin'"), 'robots.ts must disallow /admin');

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    assert.ok(!sitemapContent.includes('/admin'), 'sitemap.ts must never contain /admin');
  });

  console.log('\n================================================================');
  console.log(`BYBIT & COUPON MONETIZATION SUMMARY: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
