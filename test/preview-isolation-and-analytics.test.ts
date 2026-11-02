import assert from 'assert';
import crypto from 'crypto';
import { isLocalOrDevEnvironment, isRouteExcludedFromAds } from '../src/components/ads/MonetagZone';
import { isSmtpConfigured, sendPasswordResetEmail } from '../src/lib/auth/email';
import { requestPasswordReset } from '../src/lib/auth/passwordReset';
import { hashVisitorIdentifier } from '../src/lib/analytics/tracker';

console.log('================================================================');
console.log(' DOCUNEXA — PRODUCTION ISOLATION & ANALYTICS SECURITY TESTS    ');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>).then(() => {
          console.log(`✓ [PASS] ${name}`);
          passed++;
        }).catch((err: any) => {
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

  // Preserve initial environment
  const origNodeEnv = process.env.NODE_ENV;
  const origVercelEnv = process.env.VERCEL_ENV;
  const origPublicVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const origSmtpUser = process.env.SMTP_USER;
  const origSmtpPass = process.env.SMTP_PASS;
  const origSalt = process.env.ANALYTICS_SALT;

  try {
    // --------------------------------------------------------------------------
    // 1. MONETAG PRODUCTION-ONLY ENFORCEMENT & PREVIEW SUPPRESSION
    // --------------------------------------------------------------------------
    console.log('--- 1. MONETAG PRODUCTION-ONLY ENFORCEMENT ---');

    await test('isLocalOrDevEnvironment identifies Vercel Preview as non-production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
      assert.strictEqual(
        isLocalOrDevEnvironment(),
        true,
        'Preview environment must be recognized as non-production'
      );
    });

    await test('isLocalOrDevEnvironment identifies development as non-production', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      assert.strictEqual(
        isLocalOrDevEnvironment(),
        true,
        'Development environment must be recognized as non-production'
      );
    });

    await test('isRouteExcludedFromAds maintains strict exclusion of all 10 sensitive paths', () => {
      const sensitive = [
        '/admin',
        '/admin-setup',
        '/api',
        '/auth',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/account',
        '/choose-plan',
      ];
      for (const route of sensitive) {
        assert.strictEqual(isRouteExcludedFromAds(route), true, `${route} must be excluded`);
      }
      assert.strictEqual(isRouteExcludedFromAds('/'), false, 'Root home must be allowed');
      assert.strictEqual(isRouteExcludedFromAds('/tools'), false, 'Tools index must be allowed');
    });

    // --------------------------------------------------------------------------
    // 2. SMTP PREVIEW ISOLATION & ACCIDENTAL DELIVERY PREVENTION
    // --------------------------------------------------------------------------
    console.log('\n--- 2. SMTP PREVIEW ISOLATION ---');

    await test('isSmtpConfigured returns false when VERCEL_ENV is preview even if credentials exist', () => {
      process.env.VERCEL_ENV = 'preview';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'testapppassword';
      assert.strictEqual(
        isSmtpConfigured(),
        false,
        'SMTP must report not configured in Preview to block accidental delivery'
      );
    });

    await test('sendPasswordResetEmail refuses delivery and returns safe error in Preview', async () => {
      process.env.VERCEL_ENV = 'preview';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'testapppassword';

      const result = await sendPasswordResetEmail({
        to: 'target@example.com',
        code: '1234AB',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(
        result.error,
        'Password reset email delivery is disabled in preview deployments.'
      );
    });

    await test('sendPasswordResetEmail allows injected test transporter in Preview', async () => {
      process.env.VERCEL_ENV = 'preview';
      let sent = false;
      const mockTransporter: any = {
        sendMail: async () => {
          sent = true;
          return { messageId: 'mock-msg' };
        },
      };

      const result = await sendPasswordResetEmail({
        to: 'target@example.com',
        code: '1234AB',
        transporter: mockTransporter,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(sent, true, 'Injected mock transporter must be invoked');
    });

    await test('requestPasswordReset returns safe preview-disabled message in Preview', async () => {
      process.env.VERCEL_ENV = 'preview';
      const result = await requestPasswordReset('target@example.com', '127.0.0.1');
      assert.strictEqual(result.success, false);
      assert.strictEqual(
        result.error,
        'Password reset email service is disabled in preview deployments.'
      );
    });

    await test('isSmtpConfigured returns true in Production when credentials exist', () => {
      process.env.VERCEL_ENV = 'production';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'testapppassword';
      assert.strictEqual(
        isSmtpConfigured(),
        true,
        'SMTP must report configured in Production when credentials exist'
      );
    });

    // --------------------------------------------------------------------------
    // 3. ANALYTICS HMAC-SHA256 & SECURITY AUDIT
    // --------------------------------------------------------------------------
    console.log('\n--- 3. ANALYTICS HMAC-SHA256 & ROTATION SECURITY ---');

    await test('hashVisitorIdentifier computes exact keyed HMAC-SHA256', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.VERCEL_ENV;
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      const testSalt = 'custom-test-secret-salt-32-bytes-long';
      process.env.ANALYTICS_SALT = testSalt;

      const ip = '203.0.113.195';
      const date = '2026-11-01';

      const computed = hashVisitorIdentifier(ip, date);

      const expected = crypto
        .createHmac('sha256', testSalt)
        .update(ip + '-' + date)
        .digest('hex')
        .slice(0, 32);

      assert.strictEqual(computed, expected, 'Must match exact HMAC-SHA256 digest');
      assert.strictEqual(computed.length, 32, 'Must be 32 characters hex');
      assert.strictEqual(!computed.includes(ip), true, 'Must not leak IP address');
    });

    await test('hashVisitorIdentifier rotates hash across calendar dates (daily rotation)', () => {
      process.env.ANALYTICS_SALT = 'custom-test-secret-salt';
      const ip = '203.0.113.195';
      const hashDay1 = hashVisitorIdentifier(ip, '2026-11-01');
      const hashDay2 = hashVisitorIdentifier(ip, '2026-11-02');

      assert.notStrictEqual(
        hashDay1,
        hashDay2,
        'Hashes must differ across calendar dates for privacy rotation'
      );
    });

    await test('hashVisitorIdentifier fails safely in Production if ANALYTICS_SALT is missing', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.ANALYTICS_SALT;

      const ip = '203.0.113.195';
      const result = hashVisitorIdentifier(ip, '2026-11-01');

      assert.strictEqual(
        result,
        'anonymous-untracked',
        'Must return safe placeholder when salt is missing in production'
      );
      assert.notStrictEqual(
        result.includes('docunexa-privacy-salt-2026'),
        true,
        'Must never use the public constant fallback'
      );
    });

    await test('hashVisitorIdentifier uses local dev key in development/test when salt is unset', () => {
      (process.env as any).NODE_ENV = 'test';
      delete process.env.ANALYTICS_SALT;
      delete process.env.VERCEL_ENV;
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;

      const ip = '127.0.0.1';
      const result = hashVisitorIdentifier(ip, '2026-11-01');

      assert.strictEqual(typeof result, 'string');
      assert.strictEqual(result.length, 32);
      assert.notStrictEqual(result, 'anonymous-untracked');
    });

  } finally {
    // Restore environment
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origVercelEnv !== undefined) process.env.VERCEL_ENV = origVercelEnv;
    else delete process.env.VERCEL_ENV;
    if (origPublicVercelEnv !== undefined) process.env.NEXT_PUBLIC_VERCEL_ENV = origPublicVercelEnv;
    else delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (origSmtpUser !== undefined) process.env.SMTP_USER = origSmtpUser;
    else delete process.env.SMTP_USER;
    if (origSmtpPass !== undefined) process.env.SMTP_PASS = origSmtpPass;
    else delete process.env.SMTP_PASS;
    if (origSalt !== undefined) process.env.ANALYTICS_SALT = origSalt;
    else delete process.env.ANALYTICS_SALT;
  }

  console.log('\n================================================================');
  console.log(`PREVIEW ISOLATION & ANALYTICS SUMMARY: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
