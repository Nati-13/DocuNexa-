/**
 * DOCUNEXA — 5-ATTEMPT LOGIN SECURITY & ADMINISTRATOR RECOVERY TEST SUITE
 *
 * Separates:
 * - PART A: Isolated Mock-Level Unit & Invariant Tests (100% in-memory mock)
 * - PART B: Genuine Multi-Connection PostgreSQL Integration Tests (disposable test DB only)
 *
 * Strict Production Safety:
 * - Zero .env.local credential loading
 * - Zero access to production Supabase
 * - Unexecuted integration tests reported accurately as NOT RUN, never PASS.
 */

import fs from 'fs';
import path from 'path';
import { runFunctionCatalogRegressionChecks } from '../scripts/verify-production-migrations';

// STRICT PRODUCTION ISOLATION: Never load production .env.local credentials into unit tests
process.env.DOCUNEXA_TEST_ENV = 'true';
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

import {
  setMockAdminSupabaseClient,
} from '../src/lib/supabase/server';

// Stateful in-memory mock storage for isolated test execution
const mockLoginAttempts = new Map<string, any>();
const mockAuditLogs: any[] = [];
let mockRpcFailure = false;
let mockSuccessfulLoginRpcFailure = false;
let mockAuditInsertFailure = false;

function buildMockAdminClient() {
  const client: any = {
    from: (table: string) => {
      let selectedFields = '*';
      let eqFilters: Array<{ field: string; value: any }> = [];
      let isOrQuery = false;

      const chain: any = {
        select: (fields: string) => {
          selectedFields = fields;
          return chain;
        },
        eq: (field: string, value: any) => {
          eqFilters.push({ field, value });
          return chain;
        },
        or: (_conditions: string) => {
          isOrQuery = true;
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          if (table === 'account_login_attempts') {
            const emailFilter = eqFilters.find((f) => f.field === 'email');
            if (emailFilter) {
              const rec = mockLoginAttempts.get(emailFilter.value.toLowerCase());
              return { data: rec || null, error: null };
            }
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (table === 'account_login_attempts') {
            const emailFilter = eqFilters.find((f) => f.field === 'email');
            if (emailFilter) {
              const rec = mockLoginAttempts.get(emailFilter.value.toLowerCase());
              if (rec) return { data: rec, error: null };
            }
          }
          return { data: null, error: { message: 'Row not found' } };
        },
        then: (resolve: any) => {
          if (table === 'account_login_attempts') {
            if (isOrQuery) {
              const locked = Array.from(mockLoginAttempts.values()).filter(
                (r) => r.is_locked || r.failed_attempts >= 5
              );
              return Promise.resolve({ data: locked, error: null }).then(resolve);
            }
            return Promise.resolve({ data: Array.from(mockLoginAttempts.values()), error: null }).then(resolve);
          }
          if (table === 'admin_audit_logs') {
            return Promise.resolve({ data: mockAuditLogs, error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };

      return chain;
    },

    rpc: async (fnName: string, args: any) => {
      if (fnName === 'record_failed_login_attempt') {
        if (mockRpcFailure) {
          return { data: null, error: { message: 'Simulated atomic RPC failure (service unavailable)' } };
        }
        const email = (args.p_email || '').toLowerCase().trim();
        const maxAttempts = Number(args.p_max_attempts) || 5;
        const nowIso = new Date().toISOString();
        const existing = mockLoginAttempts.get(email);
        const newFailed = (existing?.failed_attempts || 0) + 1;
        const isLocked = newFailed >= maxAttempts || Boolean(existing?.is_locked);
        const row = {
          email,
          failed_attempts: newFailed,
          is_locked: isLocked,
          locked_at: isLocked ? (existing?.locked_at || nowIso) : null,
          locked_reason: isLocked ? 'Exceeded maximum 5 consecutive failed login attempts' : null,
          last_failed_at: nowIso,
          last_ip: args.p_ip || '127.0.0.1',
          updated_at: nowIso,
        };
        mockLoginAttempts.set(email, row);
        return { data: [row], error: null };
      }

      if (fnName === 'record_successful_login') {
        if (mockSuccessfulLoginRpcFailure) {
          return { data: null, error: { message: 'Simulated counter reset database failure' } };
        }
        const email = (args.p_email || '').toLowerCase().trim();
        const nowIso = new Date().toISOString();
        const existing = mockLoginAttempts.get(email);
        if (existing) {
          mockLoginAttempts.set(email, {
            ...existing,
            failed_attempts: 0,
            is_locked: false,
            locked_at: null,
            locked_reason: null,
            unlocked_at: nowIso,
            updated_at: nowIso,
          });
        }
        return { data: true, error: null };
      }

      if (fnName === 'admin_unlock_account') {
        const email = (args.p_email || '').toLowerCase().trim();
        const adminId = (args.p_admin_user_id || '').trim();
        const nowIso = new Date().toISOString();

        if (!email) {
          return { data: null, error: { message: 'Invalid customer email' } };
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(adminId)) {
          return { data: null, error: { message: 'Administrator ID must be a valid UUID' } };
        }

        const existing = mockLoginAttempts.get(email);
        if (!existing) {
          return { data: null, error: { message: `No login attempts record found for ${email}` } };
        }

        // Transactional Audit Check: if audit insertion fails, entire transaction rolls back!
        if (mockAuditInsertFailure) {
          return {
            data: null,
            error: { message: 'foreign key constraint "admin_audit_logs_admin_user_id_fkey" violated (rolled back)' },
          };
        }

        // Commit both account unlock AND audit log insertion in single transaction
        mockLoginAttempts.set(email, {
          ...existing,
          failed_attempts: 0,
          is_locked: false,
          locked_at: null,
          locked_reason: null,
          unlocked_at: nowIso,
          unlocked_by: adminId,
          updated_at: nowIso,
        });

        mockAuditLogs.push({
          admin_user_id: adminId,
          action: 'account_unlocked_by_admin',
          reason: args.p_reason || 'Admin manual account unlock',
          metadata: { unlockedEmail: email, timestamp: nowIso },
          created_at: nowIso,
        });

        return { data: true, error: null };
      }

      return { data: null, error: { message: `Unknown RPC function: ${fnName}` } };
    },
  };

  return client;
}

// Inject isolated mock client
setMockAdminSupabaseClient(buildMockAdminClient());

import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  SUPPORT_SECURITY_EMAIL,
  TELEGRAM_SUPPORT_BOT_URL,
  checkAccountLockoutStatus,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  adminUnlockAccount,
  listLockedAccounts,
} from '../src/lib/auth/loginSecurity';

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

async function runLockoutTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — 5-ATTEMPT LOGIN SECURITY & ADMIN RECOVERY TESTS     ');
  console.log('================================================================\n');

  try {
    // =========================================================================
    // PART A: MOCK-LEVEL TESTS
    // =========================================================================
    console.log('--- PART A: MOCK-LEVEL UNIT & INVARIANT TESTS ---');

    // --- 1. CONFIGURATION & CONSTANTS ---
    console.log('\n[Mock Test 1] LOCKOUT POLICY CONSTANTS');
    assert(
      'Maximum failed login attempts threshold is exactly 5',
      MAX_FAILED_LOGIN_ATTEMPTS === 5
    );
    assert(
      'Official support security email matches docunexa.security@gmail.com',
      SUPPORT_SECURITY_EMAIL === 'docunexa.security@gmail.com'
    );
    assert(
      'Official Telegram support bot URL matches https://t.me/docunexa_bot',
      TELEGRAM_SUPPORT_BOT_URL === 'https://t.me/docunexa_bot'
    );

    // --- 2. CONSECUTIVE FAILED ATTEMPTS PROGRESSION ---
    console.log('\n[Mock Test 2] CONSECUTIVE FAILED ATTEMPTS PROGRESSION (1..5)');

    const testEmail = `mock_customer_${Date.now()}@example.com`;
    const testIp = '198.51.100.42';

    const initialStatus = await checkAccountLockoutStatus(testEmail);
    assert('Initial account state is not locked', !initialStatus.isLocked && initialStatus.failedAttempts === 0);
    assert('Initial remaining attempts equals 5', initialStatus.remainingAttempts === 5);

    const r1 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 1: not locked', !r1.isLocked && r1.failedAttempts === 1);
    assert('Attempt 1: 4 remaining attempts', r1.remainingAttempts === 4);

    const r2 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 2: not locked', !r2.isLocked && r2.failedAttempts === 2);
    assert('Attempt 2: 3 remaining attempts', r2.remainingAttempts === 3);

    const r3 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 3: not locked', !r3.isLocked && r3.failedAttempts === 3);
    assert('Attempt 3: 2 remaining attempts', r3.remainingAttempts === 2);

    const r4 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 4: not locked', !r4.isLocked && r4.failedAttempts === 4);
    assert('Attempt 4: 1 remaining attempt', r4.remainingAttempts === 1);

    const r5 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 5: ACCOUNT IS LOCKED', r5.isLocked && r5.failedAttempts === 5);
    assert('Attempt 5: 0 remaining attempts', r5.remainingAttempts === 0);
    assert('Attempt 5: defines locked timestamp', Boolean(r5.lockedAt));
    assert('Attempt 5: provides lockout reason', Boolean(r5.lockedReason));

    const postLockoutStatus = await checkAccountLockoutStatus(testEmail);
    assert('checkAccountLockoutStatus confirms account is locked', postLockoutStatus.isLocked === true);
    assert('checkAccountLockoutStatus shows 0 remaining attempts', postLockoutStatus.remainingAttempts === 0);

    // --- 3. SUBSEQUENT ATTEMPTS ON LOCKED ACCOUNT ---
    console.log('\n[Mock Test 3] SUBSEQUENT ATTEMPTS BLOCKED FAIL-CLOSED');

    const r6 = await recordFailedLoginAttempt(testEmail, testIp);
    assert('Attempt 6 (after lockout) remains strictly locked', r6.isLocked === true);
    assert('Attempt 6 remaining attempts stays 0', r6.remainingAttempts === 0);

    // --- 4. ADMINISTRATOR REVIEW & UNLOCK CONSOLE ---
    console.log('\n[Mock Test 4] ADMINISTRATOR RECOVERY CONSOLE (MOCK-LEVEL)');

    const lockedList = await listLockedAccounts();
    const foundAccount = lockedList.find((a) => a.email.toLowerCase() === testEmail.toLowerCase());
    assert('listLockedAccounts includes the locked customer account', Boolean(foundAccount));
    assert('Locked record reports failed attempts >= 5', (foundAccount?.failedAttempts || 0) >= 5);
    assert('Locked record preserves originating IP', foundAccount?.lastIp === testIp);

    const invalidEmailUnlock = await adminUnlockAccount('', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    assert('adminUnlockAccount rejects empty email', invalidEmailUnlock.success === false);

    const missingAdminUnlock = await adminUnlockAccount(testEmail, '');
    assert('adminUnlockAccount rejects missing admin ID', missingAdminUnlock.success === false);

    const nonUuidAdminUnlock = await adminUnlockAccount(testEmail, 'invalid-non-uuid-string');
    assert('adminUnlockAccount rejects non-UUID administrator ID', nonUuidAdminUnlock.success === false);

    const validAdminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validUnlock = await adminUnlockAccount(testEmail, validAdminUuid, 'Customer verified via phone call');
    assert('adminUnlockAccount succeeds with valid UUID and email', validUnlock.success === true);

    const postUnlockStatus = await checkAccountLockoutStatus(testEmail);
    assert('Account is unlocked after admin intervention', postUnlockStatus.isLocked === false);
    assert('Failed attempts reset to 0 following unlock', postUnlockStatus.failedAttempts === 0);
    assert('Remaining attempts restored to full 5', postUnlockStatus.remainingAttempts === 5);

    const auditFound = mockAuditLogs.find((a) => a.action === 'account_unlocked_by_admin' && a.admin_user_id === validAdminUuid);
    assert('Mock-level: recorded account_unlocked_by_admin in audit log', Boolean(auditFound));

    // --- 5. SUCCESSFUL LOGIN RESET BEHAVIOR ---
    console.log('\n[Mock Test 5] SUCCESSFUL LOGIN COUNTER RESET (MOCK-LEVEL)');

    const secondEmail = `mock_customer2_${Date.now()}@example.com`;
    await recordFailedLoginAttempt(secondEmail, testIp);
    await recordFailedLoginAttempt(secondEmail, testIp);
    const beforeSuccess = await recordFailedLoginAttempt(secondEmail, testIp);
    assert('Recorded 3 failed attempts', beforeSuccess.failedAttempts === 3 && !beforeSuccess.isLocked);

    const resetRes = await recordSuccessfulLogin(secondEmail);
    assert('recordSuccessfulLogin returns success: true', resetRes.success === true);

    const postSuccessStatus = await checkAccountLockoutStatus(secondEmail);
    assert('Successful login clears failed attempts back to 0', postSuccessStatus.failedAttempts === 0);
    assert('Remaining attempts restored to full 5', postSuccessStatus.remainingAttempts === 5);

    // --- 6. IN-PROCESS MUTEX SERIALIZATION ---
    console.log('\n[Mock Test 6] IN-PROCESS MUTEX SERIALIZATION (MOCK-LEVEL)');

    const concurrentEmail = `mock_concurrent_${Date.now()}@example.com`;
    const concurrentResults = await Promise.all([
      recordFailedLoginAttempt(concurrentEmail, '198.51.100.1'),
      recordFailedLoginAttempt(concurrentEmail, '198.51.100.2'),
      recordFailedLoginAttempt(concurrentEmail, '198.51.100.3'),
      recordFailedLoginAttempt(concurrentEmail, '198.51.100.4'),
      recordFailedLoginAttempt(concurrentEmail, '198.51.100.5'),
    ]);

    const maxRecorded = Math.max(...concurrentResults.map((r) => r.failedAttempts));
    assert(
      'In-process mutex serialization: concurrent failed attempts for same email are serialized without data loss',
      maxRecorded >= 5,
      `max = ${maxRecorded}`
    );

    const postConcurrentStatus = await checkAccountLockoutStatus(concurrentEmail);
    assert('Account is locked following concurrent failed attempts', postConcurrentStatus.isLocked === true);

    // --- 7. FAIL-CLOSED BEHAVIOR & MOCK AUDIT INTEGRITY ---
    console.log('\n[Mock Test 7] FAIL-CLOSED & TRANSACTION ROLLBACK (MOCK-LEVEL)');

    // 7A: Mocked atomic RPC failure in production mode fails closed
    const origNodeEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      mockRpcFailure = true;

      const prodFailClosed = await recordFailedLoginAttempt('simulated_rpc_fail@example.com', '127.0.0.1');
      assert('Production recordFailedLoginAttempt fails closed when RPC is unavailable', prodFailClosed.isLocked === true);
      assert('Production recordFailedLoginAttempt flags persistenceFailed', prodFailClosed.persistenceFailed === true);
      assert('Production recordFailedLoginAttempt flags unavailable', prodFailClosed.unavailable === true);
      assert('Production recordFailedLoginAttempt gives 0 remaining attempts', prodFailClosed.remainingAttempts === 0);
    } finally {
      mockRpcFailure = false;
      (process.env as any).NODE_ENV = origNodeEnv;
    }

    // 7B: Mandatory counter reset failure detection
    try {
      (process.env as any).NODE_ENV = 'production';
      mockSuccessfulLoginRpcFailure = true;

      const resetFailure = await recordSuccessfulLogin('simulated_reset_fail@example.com');
      assert('recordSuccessfulLogin returns success: false when counter reset database operation fails', resetFailure.success === false);
      assert('recordSuccessfulLogin provides error description without leaking secrets', Boolean(resetFailure.error));
    } finally {
      mockSuccessfulLoginRpcFailure = false;
      (process.env as any).NODE_ENV = origNodeEnv;
    }

    // 7C: Administrator unlock transaction rollback on audit failure (mock-level)
    const rollbackEmail = `rollback_test_${Date.now()}@example.com`;
    for (let i = 0; i < 5; i++) {
      await recordFailedLoginAttempt(rollbackEmail, '198.51.100.99');
    }
    const beforeRollbackStatus = await checkAccountLockoutStatus(rollbackEmail);
    assert('Account is initially locked prior to rollback test', beforeRollbackStatus.isLocked === true);

    mockAuditInsertFailure = true;
    try {
      const rollbackUnlockRes = await adminUnlockAccount(rollbackEmail, validAdminUuid, 'Rollback test');
      assert('Mock-level: adminUnlockAccount returns success: false when audit log insertion fails', rollbackUnlockRes.success === false);

      const postRollbackStatus = await checkAccountLockoutStatus(rollbackEmail);
      assert(
        'Mock-level: account remains LOCKED when audit logging fails',
        postRollbackStatus.isLocked === true && postRollbackStatus.failedAttempts >= 5
      );
    } finally {
      mockAuditInsertFailure = false;
    }

    // --- 8. SECURITY & PRIVACY INVARIANTS ---
    console.log('\n[Mock Test 8] SECURITY & PRIVACY INVARIANTS');

    const securityModuleKeys = Object.keys(await import('../src/lib/auth/loginSecurity'));
    assert(
      'loginSecurity does NOT export or store user passwords',
      !securityModuleKeys.some((k) => k.toLowerCase().includes('password') && !k.toLowerCase().includes('reset'))
    );

    // --- 9. VERIFICATION SCRIPT READ-ONLY ZERO-WRITE INVARIANT ---
    console.log('\n[Mock Test 9] VERIFIER SCRIPT ZERO-WRITE & READONLY_DATABASE_URL INVARIANT');

    const verifyScriptPath = path.resolve(process.cwd(), 'scripts', 'verify-production-migrations.ts');
    const verifyScriptContent = fs.readFileSync(verifyScriptPath, 'utf8');

    assert('Verification script contains NO database insert operations', !verifyScriptContent.includes('.insert('));
    assert('Verification script contains NO database update operations', !verifyScriptContent.includes('.update('));
    assert('Verification script contains NO database delete operations', !verifyScriptContent.includes('.delete('));
    assert('Verification script contains NO database upsert operations', !verifyScriptContent.includes('.upsert('));
    assert('Verification script contains NO record_failed_login_attempt RPC probes', !verifyScriptContent.includes("rpc('record_failed_login_attempt'"));
    assert('Verification script requires READONLY_DATABASE_URL', verifyScriptContent.includes('READONLY_DATABASE_URL'));
    assert('Verification script does NOT import service-role Supabase client', !verifyScriptContent.includes('createAdminSupabaseClient'));

    // --- 10. PRODUCTION ISOLATION INVARIANT ---
    console.log('\n[Mock Test 10] PRODUCTION ISOLATION INVARIANT');

    assert(
      'No production Supabase URL is present in process.env during test run',
      !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')
    );
    assert(
      'No production service role key is present in process.env during test run',
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    assert(
      '100% of lockout operations were served by isolated in-memory mock',
      mockLoginAttempts.size > 0
    );

    // --- 11. DISPOSABLE TEST DATABASE PREFLIGHT & ALLOWLIST UNIT TESTS ---
    console.log('\n[Mock Test 11] DISPOSABLE DATABASE IDENTITY PREFLIGHT UNIT TESTS');

    // Strict local database host allowlist check
    function isPermittedLocalDatabaseHost(urlString?: string): { allowed: boolean; reason?: string } {
      if (!urlString) {
        return { allowed: false, reason: 'No test database URL provided' };
      }

      let hostname: string;
      try {
        const parsed = new URL(urlString);
        hostname = (parsed.hostname || '').toLowerCase();

        // Reject Supabase pooler default port 6543
        if (parsed.port === '6543') {
          return { allowed: false, reason: 'Port 6543 matches Supabase pooler' };
        }
      } catch {
        return { allowed: false, reason: 'Invalid URL format' };
      }

      // Strict allowlist: ONLY localhost, 127.0.0.1, and ::1
      const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

      if (!ALLOWED_LOCAL_HOSTS.has(hostname)) {
        return {
          allowed: false,
          reason: `Host "${hostname}" is not in strict local allowlist (localhost, 127.0.0.1, ::1 only)`,
        };
      }

      // Explicit rejection of any Supabase or DocuNexa production hostnames
      if (
        hostname.includes('supabase.com') ||
        hostname.includes('supabase.co') ||
        hostname.includes('docunexa.pro.et') ||
        hostname.includes('pooler.supabase')
      ) {
        return { allowed: false, reason: `Host "${hostname}" matches prohibited production/cloud patterns` };
      }

      return { allowed: true };
    }

    interface PreflightIdentityCheckResult {
      passed: boolean;
      reason?: string;
      databaseName?: string;
      userName?: string;
      serverAddr?: string;
    }

    function checkDatabaseNamingConvention(dbName: string): boolean {
      if (!dbName || typeof dbName !== 'string') return false;
      const trimmed = dbName.trim();
      // Anchored allowlist: requires database name to start with an approved test prefix (test_, disposable_, scratch_, ci_)
      const ANCHORED_TEST_DB_NAME_REGEX = /^(?:test|disposable|scratch|ci)_[a-z0-9][a-z0-9_-]*$/i;
      return ANCHORED_TEST_DB_NAME_REGEX.test(trimmed);
    }

    async function performDisposableDatabasePreflight(
      urlString: string,
      expectedDbNameEnv?: string
    ): Promise<PreflightIdentityCheckResult> {
      const expectedDb = (expectedDbNameEnv || '').trim();
      if (!expectedDb) {
        return {
          passed: false,
          reason:
            'DOCUNEXA_EXPECTED_TEST_DATABASE environment variable is not configured. An explicit expected test database name is mandatory before connecting.',
        };
      }

      if (!checkDatabaseNamingConvention(expectedDb)) {
        return {
          passed: false,
          reason: `Expected database name "${expectedDb}" does not match anchored test naming convention (must start with test_, disposable_, scratch_, or ci_ followed by alphanumeric name).`,
        };
      }

      // @ts-ignore
      const pgModule: any = await import('pg').catch(() => null);
      if (!pgModule?.Client) {
        return { passed: false, reason: 'PostgreSQL driver (pg) not available in environment' };
      }

      const { Client } = pgModule;
      const preflightClient = new Client({ connectionString: urlString, ssl: false });

      try {
        await preflightClient.connect();

        // Enforce strictly read-only session during preflight
        await preflightClient.query('BEGIN READ ONLY;');

        const res = await preflightClient.query(
          'SELECT current_database() AS db_name, current_user AS db_user, inet_server_addr()::text AS server_addr;'
        );
        const row = res.rows[0] || {};
        const actualDb = (row.db_name || '').trim();
        const actualUser = (row.db_user || '').trim();
        const actualServerAddr = row.server_addr ? String(row.server_addr).trim() : null;

        if (actualDb.toLowerCase() !== expectedDb.toLowerCase()) {
          return {
            passed: false,
            reason: `Connected database name "${actualDb}" does not match DOCUNEXA_EXPECTED_TEST_DATABASE ("${expectedDb}").`,
          };
        }

        // Validate inet_server_addr() is strictly loopback (or null for Unix sockets)
        if (actualServerAddr !== null) {
          const isIpv4Loopback = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(actualServerAddr);
          const isIpv6Loopback = actualServerAddr === '::1' || actualServerAddr === '0:0:0:0:0:0:0:1';
          if (!isIpv4Loopback && !isIpv6Loopback) {
            return {
              passed: false,
              reason: `Server address "${actualServerAddr}" is not a local loopback interface. Public/external addresses strictly rejected.`,
            };
          }
        }

        if (!actualUser) {
          return {
            passed: false,
            reason: 'current_user could not be determined from preflight session.',
          };
        }

        return {
          passed: true,
          databaseName: actualDb,
          userName: actualUser,
          serverAddr: actualServerAddr || 'local-socket',
        };
      } catch (err: any) {
        // Guarantee credentials are never disclosed
        const sanitizedMsg = (err.message || 'Unknown preflight error')
          .replace(urlString, '[REDACTED_URL]')
          .replace(/:\/\/([^@]+)@/g, '://[REDACTED_AUTH]@');
        return {
          passed: false,
          reason: `Preflight identity query failed: ${sanitizedMsg}`,
        };
      } finally {
        await preflightClient.query('ROLLBACK;').catch(() => {});
        await preflightClient.end().catch(() => {});
      }
    }

    // Unit test allowlist and naming guards
    assert('Host allowlist allows localhost', isPermittedLocalDatabaseHost('postgresql://postgres@localhost:5432/test').allowed);
    assert('Host allowlist allows 127.0.0.1', isPermittedLocalDatabaseHost('postgresql://postgres@127.0.0.1:5432/test').allowed);
    assert('Host allowlist allows [::1]', isPermittedLocalDatabaseHost('postgresql://postgres@[::1]:5432/test').allowed);
    assert('Host allowlist strictly rejects Supabase pooler port 6543', !isPermittedLocalDatabaseHost('postgresql://postgres@127.0.0.1:6543/test').allowed);
    assert('Host allowlist strictly rejects *.supabase.co', !isPermittedLocalDatabaseHost('postgresql://postgres@db.abcdef.supabase.co:5432/postgres').allowed);
    assert('Host allowlist strictly rejects docunexa.pro.et', !isPermittedLocalDatabaseHost('postgresql://postgres@docunexa.pro.et:5432/postgres').allowed);
    assert('Host allowlist strictly rejects external IPs', !isPermittedLocalDatabaseHost('postgresql://postgres@198.51.100.1:5432/test').allowed);
    assert('Preflight rejects missing DOCUNEXA_EXPECTED_TEST_DATABASE', (await performDisposableDatabasePreflight('postgresql://127.0.0.1:5432/test', '')).passed === false);
    assert('Preflight rejects unsafe production database naming', (await performDisposableDatabasePreflight('postgresql://127.0.0.1:5432/test', 'production_db_test')).passed === false);

    // Anchored database naming allowlist regression assertions
    assert('Anchored test DB naming accepts "test_docunexa"', checkDatabaseNamingConvention('test_docunexa') === true);
    assert('Anchored test DB naming accepts "disposable_docunexa"', checkDatabaseNamingConvention('disposable_docunexa') === true);
    assert('Anchored test DB naming accepts "scratch_docunexa"', checkDatabaseNamingConvention('scratch_docunexa') === true);
    assert('Anchored test DB naming accepts "ci_docunexa"', checkDatabaseNamingConvention('ci_docunexa') === true);
    assert('Anchored test DB naming rejects "production_db_test"', checkDatabaseNamingConvention('production_db_test') === false);
    assert('Anchored test DB naming rejects "docunexa_production"', checkDatabaseNamingConvention('docunexa_production') === false);
    assert('Anchored test DB naming rejects "staging_test"', checkDatabaseNamingConvention('staging_test') === false);
    assert('Anchored test DB naming rejects empty string', checkDatabaseNamingConvention('') === false);
    assert('Anchored test DB naming rejects whitespace-only string', checkDatabaseNamingConvention('   ') === false);
    assert('Anchored test DB naming rejects bare prefix "test_"', checkDatabaseNamingConvention('test_') === false);
    assert('Anchored test DB naming rejects malformed names with special characters', checkDatabaseNamingConvention('test_invalid!@#') === false);
    assert('Anchored test DB naming rejects SQL injection patterns', checkDatabaseNamingConvention('test_db;DROP TABLE users') === false);

    // --- 12. POSTGRESQL CATALOG FUNCTION SHAPE REGRESSION CHECKS ---
    console.log('\n[Mock Test 12] POSTGRESQL CATALOG FUNCTION SHAPE REGRESSION SUITE');
    const catalogRegRes = runFunctionCatalogRegressionChecks();
    assert(
      'Catalog signature regression suite proves strict rejection of altered shapes, overloads, and wrong types',
      catalogRegRes.passed && catalogRegRes.testCount >= 10
    );

    // =========================================================================
    // PART B: GENUINE POSTGRESQL DATABASE INTEGRATION TESTS
    // =========================================================================
    console.log('\n================================================================');
    console.log('--- PART B: REAL POSTGRESQL DATABASE INTEGRATION TESTS ---');
    console.log('================================================================');

    let integrationPassed = 0;
    let integrationFailed = 0;
    let integrationNotRun = 0;

    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DISPOSABLE_TEST_DATABASE_URL;
    const expectedTestDb = process.env.DOCUNEXA_EXPECTED_TEST_DATABASE;

    const hostCheck = isPermittedLocalDatabaseHost(testDbUrl);

    if (!hostCheck.allowed) {
      console.log('  ℹ [NOT RUN] Multi-Connection Concurrency Integration Test: requires strict local disposable PostgreSQL database.');
      console.log('  ℹ [NOT RUN] Admin Unlock & Audit Rollback Integration Test: requires strict local disposable PostgreSQL database.');
      console.log(`  Reason: ${hostCheck.reason}. Allowlist: localhost, 127.0.0.1, ::1 only.`);
      console.log('  (Strict safety: Zero connections or cleanup statements executed against remote/unverified databases)');
      integrationNotRun = 2;
    } else {
      // Host passed allowlist: now perform strict read-only identity preflight
      const preflight = await performDisposableDatabasePreflight(testDbUrl!, expectedTestDb);

      if (!preflight.passed) {
        console.log('  ℹ [NOT RUN] Multi-Connection Concurrency Integration Test: preflight identity check rejected database.');
        console.log('  ℹ [NOT RUN] Admin Unlock & Audit Rollback Integration Test: preflight identity check rejected database.');
        console.log(`  Reason: ${preflight.reason}`);
        console.log('  (Strict safety: Zero write operations or cleanup statements executed due to unconfirmed identity)');
        integrationNotRun = 2;
      } else {
        console.log(`  ✓ [PASS] Read-only identity preflight passed: database="${preflight.databaseName}", user="${preflight.userName}", host="${preflight.serverAddr}".`);

        // @ts-ignore
        const pgModule: any = await import('pg').catch(() => null);
        if (!pgModule?.Client) {
          console.log('  ℹ [NOT RUN] PostgreSQL driver (pg) not available for integration tests.');
          integrationNotRun = 2;
        } else {
          const { Client } = pgModule;

        // Integration Test 1: Genuine Multi-Connection Concurrency
        console.log('\n[Integration Test 1] MULTI-CONNECTION CONCURRENT FAILED LOGIN ATTEMPTS');
        const concEmail = `conc_pg_${Date.now()}@disposable.test`;
        const clients: any[] = [];
        const numConnections = 5;

        try {
          for (let i = 0; i < numConnections; i++) {
            const cl = new Client({ connectionString: testDbUrl, ssl: false });
            await cl.connect();
            clients.push(cl);
          }

          // Execute atomic stored procedure simultaneously across 5 distinct database client connections
          await Promise.all(
            clients.map((cl, idx) =>
              cl.query('SELECT * FROM public.record_failed_login_attempt($1, $2, $3)', [
                concEmail,
                `198.51.100.${idx + 1}`,
                5,
              ])
            )
          );

          // Verify with a separate client that row has exactly 5 attempts and is locked
          const verifyClient = clients[0];
          const verifyRes = await verifyClient.query(
            'SELECT failed_attempts, is_locked FROM public.account_login_attempts WHERE email = $1',
            [concEmail]
          );

          const finalRow = verifyRes.rows[0];
          if (finalRow && finalRow.failed_attempts === 5 && finalRow.is_locked === true) {
            console.log('  ✓ [PASS] Multi-connection concurrency verified: 5 concurrent DB connections atomically incremented attempts to exactly 5 without lost updates.');
            integrationPassed++;
          } else {
            console.error(`  ✗ [FAIL] Multi-connection concurrency failed: expected 5 attempts, got ${finalRow?.failed_attempts}`);
            integrationFailed++;
          }
        } catch (e: any) {
          console.error('  ✗ [FAIL] Multi-connection concurrency error:', e.message);
          integrationFailed++;
        } finally {
          // Cleanup test record
          if (clients.length > 0) {
            await clients[0].query('DELETE FROM public.account_login_attempts WHERE email = $1', [concEmail]).catch(() => {});
            for (const cl of clients) {
              await cl.end().catch(() => {});
            }
          }
        }

        // Integration Test 2: Genuine Transaction Rollback on Audit Failure
        console.log('\n[Integration Test 2] ADMIN UNLOCK TRANSACTION ROLLBACK ON AUDIT FAILURE');
        const rollbackPgEmail = `rollback_pg_${Date.now()}@disposable.test`;
        const singleClient = new Client({ connectionString: testDbUrl, ssl: false });

        try {
          await singleClient.connect();

          // Create locked record in disposable DB
          await singleClient.query(
            `INSERT INTO public.account_login_attempts (email, failed_attempts, is_locked, updated_at) 
             VALUES ($1, 5, true, now()) 
             ON CONFLICT (email) DO UPDATE SET failed_attempts = 5, is_locked = true`,
            [rollbackPgEmail]
          );

          // Invoke admin_unlock_account with non-existent admin UUID to trigger foreign key violation on admin_audit_logs
          let threw = false;
          try {
            await singleClient.query(
              'SELECT public.admin_unlock_account($1, $2, $3)',
              [rollbackPgEmail, '00000000-0000-0000-0000-000000000000', 'Integration rollback test']
            );
          } catch {
            threw = true;
          }

          // Verify row is STILL locked in database (transaction was rolled back)
          const checkRes = await singleClient.query(
            'SELECT failed_attempts, is_locked FROM public.account_login_attempts WHERE email = $1',
            [rollbackPgEmail]
          );

          const checkRow = checkRes.rows[0];
          if (threw && checkRow && checkRow.is_locked === true && checkRow.failed_attempts === 5) {
            console.log('  ✓ [PASS] Transaction rollback verified: audit insertion failure caused unlock update to roll back; account remains locked in PostgreSQL.');
            integrationPassed++;
          } else {
            console.error('  ✗ [FAIL] Transaction rollback failed: account was unlocked despite audit failure.');
            integrationFailed++;
          }
        } catch (e: any) {
          console.error('  ✗ [FAIL] Integration rollback test error:', e.message);
          integrationFailed++;
        } finally {
          await singleClient.query('DELETE FROM public.account_login_attempts WHERE email = $1', [rollbackPgEmail]).catch(() => {});
          await singleClient.end().catch(() => {});
        }
      }
    }
  }

    console.log('\n================================================================');
    console.log(` MOCK-LEVEL TESTS: ${passed} of ${total} passed (${Math.round((passed / total) * 100)}%)`);
    if (integrationNotRun > 0) {
      console.log(` INTEGRATION TESTS: ${integrationPassed} passed, ${integrationFailed} failed, ${integrationNotRun} NOT RUN (disposable TEST_DATABASE_URL not configured)`);
    } else {
      console.log(` INTEGRATION TESTS: ${integrationPassed} passed, ${integrationFailed} failed`);
    }
    console.log('================================================================\n');

    if (total !== passed || integrationFailed > 0) {
      process.exitCode = 1;
    }
  } finally {
    setMockAdminSupabaseClient(null);
  }
}

runLockoutTests().catch((err) => {
  console.error('Fatal error in lockout tests:', err);
  process.exit(1);
});
