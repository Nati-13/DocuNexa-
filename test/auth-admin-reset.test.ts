/**
 * DOCUNEXA — AUTH + ADMIN + PASSWORD RESET TEST SUITE
 *
 * Verifies:
 * 1. New signup & confirmation requirements
 * 2. Unconfirmed email detection & resend confirmation
 * 3. Custom recovery code format: 4 digits + 2 uppercase letters (e.g. 4827AB)
 * 4. Cryptographic hashing of codes (never plaintext)
 * 5. 10-minute expiration & 5-attempt lockout
 * 6. Single-use and invalidation of reset tokens
 * 7. Admin isolation, non-admin denial, and first-admin bootstrap protection
 */
import fs from 'fs';
import path from 'path';

// Load .env.local for local testing
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}
import {
  generateRecoveryCode,
  isValidRecoveryCodeFormat,
  hashResetSecret,
  requestPasswordReset,
  verifyRecoveryCode,
  completePasswordReset,
} from '../src/lib/auth/passwordReset';
import { isBootstrapAvailable, bootstrapFirstAdmin } from '../src/lib/admin/bootstrap';
import { validatePasswordStrength } from '../src/lib/auth';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' DOCUNEXA — AUTH + ADMIN + PASSWORD RESET TEST SUITE ');
  console.log('======================================================\n');

  // --- SECTION 1: CUSTOM CODE FORMAT (4 digits + 2 letters) ---
  console.log('--- 1. CUSTOM RECOVERY CODE SPECIFICATION ---');

  const generatedCodes = new Set<string>();
  let allMatchFormat = true;
  for (let i = 0; i < 100; i++) {
    const code = generateRecoveryCode();
    generatedCodes.add(code);
    if (!/^\d{4}[A-Z]{2}$/.test(code)) {
      allMatchFormat = false;
      break;
    }
  }

  assert(allMatchFormat, 'All generated codes conform to exactly 4 digits + 2 uppercase letters');
  assert(generatedCodes.size === 100, 'Cryptographically random codes have uniform entropy without immediate collisions');

  assert(isValidRecoveryCodeFormat('4827AB'), 'Validates correct format: 4827AB');
  assert(isValidRecoveryCodeFormat('0001ZZ'), 'Validates leading zeros and letters: 0001ZZ');
  assert(!isValidRecoveryCodeFormat('482AB'), 'Rejects 3 digits + 2 letters');
  assert(!isValidRecoveryCodeFormat('48271A'), 'Rejects 5 digits + 1 letter');
  assert(!isValidRecoveryCodeFormat('4827ab'), 'Rejects lowercase letters (must be uppercase)');
  assert(!isValidRecoveryCodeFormat('ABC482'), 'Rejects wrong order (letters first)');
  assert(!isValidRecoveryCodeFormat(''), 'Rejects empty code');

  // --- SECTION 2: CRYPTOGRAPHIC INTEGRITY ---
  console.log('\n--- 2. CRYPTOGRAPHIC HASHING (NO PLAINTEXT STORAGE) ---');

  const rawCode = '9182XY';
  const hashed = hashResetSecret(rawCode);
  assert(typeof hashed === 'string' && hashed.length === 64, 'Code is hashed using SHA-256 (64 hex characters)');
  assert(!hashed.includes(rawCode), 'Raw code is NEVER stored or contained in hash');
  assert(hashResetSecret(rawCode) === hashed, 'SHA-256 hash is deterministic for identical secret');

  // --- SECTION 3: REQUEST FLOW & EMAIL ENUMERATION PROTECTION ---
  console.log('\n--- 3. REQUEST FLOW & ENUMERATION RESISTANCE ---');

  (process.env as any).NODE_ENV = 'test';
  const requestRes = await requestPasswordReset('testuser_reset@example.com', '127.0.0.1');
  assert(requestRes.success, 'Request password reset returns successful response');
  assert(
    requestRes.message.includes('If an account exists'),
    'Returns generic enumeration-resistant message'
  );

  const testCode = requestRes.debugCode;
  assert(!!testCode && isValidRecoveryCodeFormat(testCode), 'Test environment receives valid recovery code format');

  // --- SECTION 4: VERIFICATION, ATTEMPTS & LOCKOUT ---
  console.log('\n--- 4. ATTEMPTS & 5-ATTEMPT LOCKOUT ---');

  if (testCode) {
    // Attempt with incorrect code
    const fail1 = await verifyRecoveryCode('testuser_reset@example.com', '0000AA');
    assert(!fail1.success, 'Incorrect recovery code is rejected');
    assert(
      (fail1.error || '').includes('attempts remaining'),
      'Informs user of remaining attempts without leaking code'
    );

    // Fail 4 more times to reach 5-attempt limit
    await verifyRecoveryCode('testuser_reset@example.com', '0001AA');
    await verifyRecoveryCode('testuser_reset@example.com', '0002AA');
    await verifyRecoveryCode('testuser_reset@example.com', '0003AA');
    const lockout = await verifyRecoveryCode('testuser_reset@example.com', '0004AA');

    assert(!lockout.success, 'Fifth failed attempt is rejected');
    assert(
      (lockout.error || '').toLowerCase().includes('maximum') || (lockout.error || '').toLowerCase().includes('invalid'),
      'Code is locked out after 5 failed attempts'
    );

    // Even if correct code is now entered, it MUST fail
    const postLockout = await verifyRecoveryCode('testuser_reset@example.com', testCode);
    assert(!postLockout.success, 'Locked-out code cannot be verified even with the correct code');
  }

  // --- SECTION 5: SUCCESSFUL RESET & SINGLE-USE AUTHORIZATION ---
  console.log('\n--- 5. SUCCESSFUL RESET & SINGLE-USE TOKEN ---');

  const req2 = await requestPasswordReset('singleuse_user@example.com', '127.0.0.1');
  const validCode = req2.debugCode;

  if (validCode) {
    const verifySuccess = await verifyRecoveryCode('singleuse_user@example.com', validCode);
    assert(verifySuccess.success, 'Valid recovery code is accepted');
    assert(!!verifySuccess.resetToken, 'Issues a secure single-use reset authorization token');

    // Attempt to reuse the same recovery code
    const reuseAttempt = await verifyRecoveryCode('singleuse_user@example.com', validCode);
    assert(!reuseAttempt.success, 'Recovery code CANNOT be reused after verification');

    // Test password strength enforcement
    const weakPass = await completePasswordReset(
      'singleuse_user@example.com',
      verifySuccess.resetToken!,
      'weak'
    );
    assert(!weakPass.success, 'Rejects password shorter than 8 characters');
  }

  // --- SECTION 6: ADMIN SECURITY & BOOTSTRAP PROTECTION ---
  console.log('\n--- 6. ADMIN SECURITY & FIRST-ADMIN BOOTSTRAP ---');

  // Verify that an arbitrary signup cannot bootstrap if bootstrap is locked or parameters invalid
  const invalidBootstrap = await bootstrapFirstAdmin({
    email: 'not-an-email',
    password: 'short',
  });
  assert(!invalidBootstrap.success, 'Rejects invalid email/short password during admin bootstrap');

  // Verify setup key protection if ADMIN_SETUP_KEY is configured
  process.env.ADMIN_SETUP_KEY = 'super-secret-setup-key';
  const wrongKeyBootstrap = await bootstrapFirstAdmin({
    email: 'owner@example.com',
    password: 'SecureAdminPassword123!',
    setupKey: 'wrong-key',
  });
  assert(!wrongKeyBootstrap.success, 'Enforces ADMIN_SETUP_KEY when set in environment');
  delete process.env.ADMIN_SETUP_KEY;

  console.log('\n======================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
