import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { hashClientIdentifier, isRateLimited } from '../src/lib/security/rateLimit';
import { guardApiRequest, secureJsonResponse } from '../src/lib/security/apiGuard';

console.log('================================================================');
console.log('       DOCUNEXA — 5 HIGH-SECURITY LAYERS ACCEPTANCE AUDIT       ');
console.log('================================================================\n');

async function runSecurityTests() {
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

  // 1. LAYER 1: AUTHENTICATION + SESSION HARDENING
  console.log('--- 1. LAYER 1: AUTHENTICATION + SESSION HARDENING ---');

  test('Middleware updateSession module exists and is wired in src/middleware.ts', () => {
    const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
    const proxyPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'proxy.ts');
    const helperPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'middleware.ts');

    assert.ok(fs.existsSync(middlewarePath), 'src/middleware.ts must exist');
    assert.ok(fs.existsSync(proxyPath), 'src/lib/supabase/proxy.ts must exist');
    assert.ok(fs.existsSync(helperPath), 'src/lib/supabase/middleware.ts must exist');

    const content = fs.readFileSync(helperPath, 'utf8');
    assert.ok(content.includes('createServerClient'), 'Must use @supabase/ssr createServerClient');
    assert.ok(content.includes('getAll'), 'Must implement cookie getAll');
    assert.ok(content.includes('setAll'), 'Must implement cookie setAll');
    assert.ok(content.includes('getUser'), 'Must validate session via getUser() or getClaims()');
  });

  test('Server claims helper getServerAuthClaims exists in src/lib/supabase/server.ts', () => {
    const serverPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'server.ts');
    const content = fs.readFileSync(serverPath, 'utf8');
    assert.ok(content.includes('getServerAuthClaims'), 'Must export getServerAuthClaims helper');
    assert.ok(content.includes('getClaims'), 'Must call getClaims for PKCE validation');
  });

  test('Account and choose-plan pages are marked force-dynamic to prevent unsafe static caching', () => {
    const accountPage = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'account', 'page.tsx'), 'utf8');
    const choosePlanPage = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'choose-plan', 'page.tsx'), 'utf8');

    assert.ok(accountPage.includes("dynamic = 'force-dynamic'"), 'Account page must be force-dynamic');
    assert.ok(choosePlanPage.includes("dynamic = 'force-dynamic'"), 'Choose plan page must be force-dynamic');
  });

  // 2. LAYER 2: ZERO-TRUST ADMIN & MFA
  console.log('\n--- 2. LAYER 2: ZERO-TRUST ADMIN & MFA ---');

  test('Admin navigation includes Security & MFA and Settings tabs', () => {
    const navContent = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'admin', 'AdminNav.tsx'), 'utf8');
    assert.ok(navContent.includes('/admin/security'), 'Must contain /admin/security');
    assert.ok(navContent.includes('/admin/settings'), 'Must contain /admin/settings');
  });

  test('Admin layout returns proper 403 Forbidden page for non-admin authenticated users', () => {
    const layoutContent = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'admin', 'layout.tsx'), 'utf8');
    assert.ok(layoutContent.includes('403 — Access Forbidden'), 'Must render 403 Forbidden screen');
    assert.ok(layoutContent.includes('isUserAdmin'), 'Must check database admin allowlist');
  });

  test('Admin Security & MFA page exists with TOTP enrollment capabilities', () => {
    const securityPage = path.join(process.cwd(), 'src', 'app', 'admin', 'security', 'page.tsx');
    assert.ok(fs.existsSync(securityPage), '/admin/security/page.tsx must exist');
    const content = fs.readFileSync(securityPage, 'utf8');
    assert.ok(content.includes('getAuthenticatorAssuranceLevel'), 'Must check AAL level');
    assert.ok(content.includes('mfa.enroll'), 'Must support TOTP factor enrollment');
  });

  // 3. LAYER 3: API ABUSE & PRIVACY-PRESERVING RATE LIMITING
  console.log('\n--- 3. LAYER 3: API ABUSE & RATE LIMITING ---');

  test('hashClientIdentifier creates deterministic SHA-256 hash without exposing raw IP', () => {
    const hash1 = hashClientIdentifier('192.168.1.1', 'Mozilla/5.0', 'login');
    const hash2 = hashClientIdentifier('192.168.1.1', 'Mozilla/5.0', 'login');
    const hash3 = hashClientIdentifier('192.168.1.2', 'Mozilla/5.0', 'login');

    assert.strictEqual(hash1, hash2, 'Identical client identifiers must hash to identical keys');
    assert.notStrictEqual(hash1, hash3, 'Different client IPs must hash to distinct keys');
    assert.strictEqual(hash1.includes('192.168'), false, 'Hash must not leak raw IP characters');
    assert.strictEqual(hash1.length, 32, 'Hash must be 32 hex characters');
  });

  test('isRateLimited allows requests under threshold and blocks requests over limit', async () => {
    const testKey = `test-client-${Date.now()}`;
    const maxReq = 3;
    const windowSec = 10;

    const r1 = await isRateLimited(testKey, maxReq, windowSec);
    assert.strictEqual(r1.limited, false, 'First request must pass');

    const r2 = await isRateLimited(testKey, maxReq, windowSec);
    assert.strictEqual(r2.limited, false, 'Second request must pass');

    const r3 = await isRateLimited(testKey, maxReq, windowSec);
    assert.strictEqual(r3.limited, false, 'Third request must pass');

    const r4 = await isRateLimited(testKey, maxReq, windowSec);
    assert.strictEqual(r4.limited, true, 'Fourth request must be rate limited');
    assert.ok(r4.resetInSeconds > 0, 'Must provide reset duration in seconds');
  });

  test('guardApiRequest enforces allowed HTTP methods', async () => {
    const fakeGetReq = new Request('https://docunexa.pro.et/api/auth/login', { method: 'GET' });
    const { errorResponse } = await guardApiRequest(fakeGetReq, { allowedMethods: ['POST'] });
    assert.ok(errorResponse, 'Must return error response on disallowed method');
    assert.strictEqual(errorResponse.status, 405, 'Status code must be 405 Method Not Allowed');
  });

  test('guardApiRequest enforces maximum request payload size', async () => {
    const fakeBigReq = new Request('https://docunexa.pro.et/api/auth/login', {
      method: 'POST',
      headers: { 'content-length': '70000' },
    });
    const { errorResponse } = await guardApiRequest(fakeBigReq, {
      allowedMethods: ['POST'],
      maxBodyBytes: 64000,
    });
    assert.ok(errorResponse, 'Must reject oversized payload');
    assert.strictEqual(errorResponse.status, 413, 'Status must be 413 Payload Too Large');
  });

  test('secureJsonResponse attaches request-id and non-cacheable headers', () => {
    const reqId = 'test-trace-id-123';
    const res = secureJsonResponse({ success: true }, { status: 200 }, reqId);
    assert.strictEqual(res.headers.get('x-request-id'), reqId, 'Must attach x-request-id');
    assert.ok(
      res.headers.get('cache-control')?.includes('no-store'),
      'Must attach Cache-Control: no-store'
    );
  });

  // 4. LAYER 4: DATABASE & RLS HARDENING
  console.log('\n--- 4. LAYER 4: DATABASE & RLS HARDENING ---');

  test('Rate limits migration file exists and enforces service_role isolation', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261006000001_security_rate_limits.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261006000001 must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('rate_limits'), 'Must create rate_limits table');
    assert.ok(content.includes('enable row level security'), 'Must enable RLS');
    assert.ok(content.includes('check_rate_limit'), 'Must define check_rate_limit function');
    assert.ok(content.includes('set search_path = public, pg_temp'), 'Must harden search path');
    assert.ok(content.includes('revoke all on function public.check_rate_limit'), 'Must revoke public execution');
  });

  // 5. LAYER 5: PAYMENT SECRETS & BROWSER SECURITY HEADERS
  console.log('\n--- 5. LAYER 5: PAYMENT SECRETS & BROWSER HEADERS ---');

  test('next.config.ts configures comprehensive security headers and compatible CSP', () => {
    const nextConfigContent = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8');
    assert.ok(nextConfigContent.includes('X-Content-Type-Options'), 'Must have X-Content-Type-Options: nosniff');
    assert.ok(nextConfigContent.includes('X-Frame-Options'), 'Must have X-Frame-Options: DENY');
    assert.ok(nextConfigContent.includes('Strict-Transport-Security'), 'Must have HSTS');
    assert.ok(nextConfigContent.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
    assert.ok(nextConfigContent.includes('quge5.com'), 'CSP must allow Monetag ad network');
    assert.ok(nextConfigContent.includes('fonts.googleapis.com'), 'CSP must allow Google Fonts');
    assert.ok(nextConfigContent.includes('worker-src'), 'CSP must allow PDF.js / OCR workers');
  });

  console.log('\n================================================================');
  console.log(`ALL ${passed} OF ${total} SECURITY AUDIT TESTS PASSED (100%)!`);
  console.log('================================================================\n');
}

runSecurityTests().catch((err) => {
  console.error('Security audit failed:', err);
  process.exit(1);
});
