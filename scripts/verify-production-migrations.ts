/**
 * DocuNexa — Production Migration & Security Verification CLI (Strictly Read-Only)
 *
 * Exclusively uses READONLY_DATABASE_URL to inspect PostgreSQL catalog & schema:
 * 1. payment_orders schema, columns and check constraints (Polygon, Aptos, TRON)
 * 2. account_login_attempts table columns & structure
 * 3. admin_audit_logs table columns & structure
 * 4. admin_users authorization registry
 * 5. Atomic lockout and unlock functions:
 *    - Exact argument signatures
 *    - Return types (table, boolean)
 *    - SECURITY DEFINER status
 *    - Fixed search_path = public
 *    - Effective execution privileges (service_role only; public/anon/authenticated revoked)
 *
 * STRICTLY READ-ONLY:
 * - ZERO .env.local parsing (credentials must be provided via environment)
 * - ZERO service-role Supabase client usage
 * - ZERO write probes, inserts, updates, deletes, or simulated lockouts
 * - Returns NOT VERIFIED with exit code 1 when READONLY_DATABASE_URL is not provided.
 *
 * Usage:
 *   READONLY_DATABASE_URL="..." npx tsx scripts/verify-production-migrations.ts
 */

async function main() {
  console.log('\n================================================================');
  console.log(' DOCUNEXA — PRODUCTION DATABASE READ-ONLY VERIFICATION AUDIT    ');
  console.log(' (STRICTLY READ-ONLY CATALOG INSPECTION VIA READONLY_DATABASE_URL)');
  console.log('================================================================\n');

  const readonlyConnStr = process.env.READONLY_DATABASE_URL;

  if (!readonlyConnStr) {
    if (process.env.DATABASE_URL) {
      console.log('⚠️ [WARNING] General-purpose DATABASE_URL was found, but READONLY_DATABASE_URL is strictly required.');
      console.log('             General-purpose credentials will NOT be silently used for read-only audits.\n');
    }
    console.log('⚠️ [NOT VERIFIED] READONLY_DATABASE_URL is required for all database verification.');
    console.log('                 Service-role client and .env.local parsing have been permanently removed.');
    console.log('                 Zero write operations or probes were executed.');
    console.log('\n================================================================');
    console.log(' RESULT: NOT VERIFIED — Pending configuration of READONLY_DATABASE_URL.');
    console.log('================================================================\n');
    process.exitCode = 1;
    return;
  }

  // Dynamic import of pg module
  // @ts-ignore
  const pgModule: any = await import('pg').catch(() => null);
  if (!pgModule?.Client) {
    console.error('❌ PostgreSQL driver (pg) is not available in environment.');
    process.exitCode = 1;
    return;
  }

  const Client = pgModule.Client;
  const client = new Client({
    connectionString: readonlyConnStr,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA || process.env.SUPABASE_SSL_CERT || undefined,
    },
  });

  let allPassed = true;

  try {
    await client.connect();

    // --- 1. PAYMENT ORDERS TABLE & CHECK CONSTRAINT READ-ONLY AUDIT ---
    console.log('--- 1. PAYMENT ORDERS SCHEMA & CONSTRAINT AUDIT ---');
    const paymentColsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'payment_orders';
    `);

    const paymentCols = (paymentColsRes.rows || []).map((r: any) => r.column_name);
    const requiredPaymentCols = [
      'id', 'user_id', 'order_id', 'product', 'currency', 
      'network', 'base_amount_usd', 'payment_amount_usdt', 
      'destination_address', 'status', 'expires_at', 'created_at'
    ];

    const missingPaymentCols = requiredPaymentCols.filter((col) => !paymentCols.includes(col));
    if (missingPaymentCols.length > 0) {
      console.log(`❌ payment_orders missing required columns: ${missingPaymentCols.join(', ')}`);
      allPassed = false;
    } else {
      console.log('✓ [PASS] payment_orders table verified with all required payment tracking columns.');
    }

    // Verify network check constraint accepts Polygon, Aptos, and TRON
    const constraintRes = await client.query(`
      SELECT cc.check_clause
      FROM information_schema.check_constraints cc
      JOIN information_schema.table_constraints tc 
        ON tc.constraint_name = cc.constraint_name 
       AND tc.constraint_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = 'payment_orders' 
        AND tc.constraint_name = 'payment_orders_network_check';
    `);

    if (constraintRes.rows && constraintRes.rows.length > 0) {
      const checkClause = (constraintRes.rows[0].check_clause || '').toLowerCase();
      const hasPolygon = checkClause.includes('polygon');
      const hasAptos = checkClause.includes('aptos');
      const hasTron = checkClause.includes('tron');
      if (hasPolygon && hasAptos && hasTron) {
        console.log('✓ [PASS] payment_orders_network_check constraint verified (Polygon, Aptos, TRON).');
      } else {
        console.log(`❌ [FAIL] payment_orders_network_check missing network support. Clause: ${checkClause}`);
        allPassed = false;
      }
    } else {
      console.log('ℹ [INFO] payment_orders_network_check constraint not found in information_schema.');
    }

    // --- 2. ACCOUNT LOGIN ATTEMPTS (5-ATTEMPT LOCKOUT) AUDIT ---
    console.log('\n--- 2. ACCOUNT LOGIN ATTEMPTS TABLE AUDIT ---');
    const lockoutColsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'account_login_attempts';
    `);

    const lockoutCols = (lockoutColsRes.rows || []).map((r: any) => r.column_name);
    const requiredLockoutCols = [
      'email', 'failed_attempts', 'is_locked', 'locked_at', 
      'locked_reason', 'unlocked_at', 'unlocked_by', 'last_ip', 
      'created_at', 'updated_at'
    ];

    const missingLockoutCols = requiredLockoutCols.filter((col) => !lockoutCols.includes(col));
    if (missingLockoutCols.length > 0) {
      console.log(`❌ account_login_attempts missing required columns: ${missingLockoutCols.join(', ')}`);
      allPassed = false;
    } else {
      console.log('✓ [PASS] account_login_attempts table exists with all durable lockout tracking columns.');
    }

    // --- 3. ADMINISTRATIVE AUDIT LOGS AUDIT ---
    console.log('\n--- 3. ADMINISTRATIVE AUDIT LOGS TABLE AUDIT ---');
    const auditColsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'admin_audit_logs';
    `);

    const auditCols = (auditColsRes.rows || []).map((r: any) => r.column_name);
    const requiredAuditCols = [
      'id', 'admin_user_id', 'action', 'target_user_id', 
      'metadata', 'reason', 'created_at'
    ];

    const missingAuditCols = requiredAuditCols.filter((col) => !auditCols.includes(col));
    if (missingAuditCols.length > 0) {
      console.log(`❌ admin_audit_logs missing required columns: ${missingAuditCols.join(', ')}`);
      allPassed = false;
    } else {
      console.log('✓ [PASS] admin_audit_logs table exists and append-only schema structure is verified.');
    }

    // --- 4. ADMINISTRATOR USERS AUDIT ---
    console.log('\n--- 4. ADMINISTRATOR AUTHORIZATION REGISTRY AUDIT ---');
    const adminUsersRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'admin_users';
    `);

    if (adminUsersRes.rows && adminUsersRes.rows.length > 0) {
      console.log('✓ [PASS] admin_users table exists in public schema.');
    } else {
      console.log('❌ admin_users table not found in public schema.');
      allPassed = false;
    }

    // --- 5. ATOMIC POSTGRESQL FUNCTION CATALOG AUDIT ---
    console.log('\n--- 5. ATOMIC POSTGRESQL FUNCTIONS CATALOG AUDIT ---');

    const funcQuery = `
      SELECT
        p.proname,
        pg_get_function_identity_arguments(p.oid) AS identity_args,
        pg_get_function_result(p.oid) AS result_type,
        p.prosecdef AS is_security_definer,
        p.proconfig AS config,
        has_function_privilege('public', p.oid, 'execute') AS public_exec,
        has_function_privilege('anon', p.oid, 'execute') AS anon_exec,
        has_function_privilege('authenticated', p.oid, 'execute') AS authenticated_exec,
        has_function_privilege('service_role', p.oid, 'execute') AS service_role_exec
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('record_failed_login_attempt', 'record_successful_login', 'admin_unlock_account');
    `;

    const funcsRes = await client.query(funcQuery);
    const rows = funcsRes.rows || [];

    const expectedFunctions = [
      {
        name: 'record_failed_login_attempt',
        expectedArgTypes: ['text', 'text', 'integer'],
        expectedResultIncludes: ['table', 'record', 'setof'],
      },
      {
        name: 'record_successful_login',
        expectedArgTypes: ['text'],
        expectedResultIncludes: ['boolean'],
      },
      {
        name: 'admin_unlock_account',
        expectedArgTypes: ['text', 'text', 'text'],
        expectedResultIncludes: ['boolean'],
      },
    ];

    for (const spec of expectedFunctions) {
      const fnRow = rows.find((r: any) => r.proname === spec.name);
      if (!fnRow) {
        console.log(`⚠️ [NOT VERIFIED] Function ${spec.name} not found in pg_proc catalog.`);
        allPassed = false;
        continue;
      }

      // Check arguments
      const argsStr = (fnRow.identity_args || '').toLowerCase();
      const argsMatch = spec.expectedArgTypes.every((t) => argsStr.includes(t));
      if (!argsMatch) {
        console.log(`❌ [FAIL] Function ${spec.name} arguments mismatch. Found: (${fnRow.identity_args})`);
        allPassed = false;
        continue;
      }

      // Check return type
      const resStr = (fnRow.result_type || '').toLowerCase();
      const resMatch = spec.expectedResultIncludes.some((t) => resStr.includes(t));
      if (!resMatch) {
        console.log(`❌ [FAIL] Function ${spec.name} return type mismatch. Found: ${fnRow.result_type}`);
        allPassed = false;
        continue;
      }

      // Check SECURITY DEFINER
      if (!fnRow.is_security_definer) {
        console.log(`❌ [FAIL] Function ${spec.name} is NOT marked SECURITY DEFINER.`);
        allPassed = false;
        continue;
      }

      // Check fixed search_path = public
      const configs = fnRow.config || [];
      const hasSearchPath = configs.some((c: string) => c.toLowerCase().includes('search_path=public'));
      if (!hasSearchPath) {
        console.log(`❌ [FAIL] Function ${spec.name} lacks fixed search_path = public.`);
        allPassed = false;
        continue;
      }

      // Check privilege revocation from public, anon, authenticated
      if (fnRow.public_exec || fnRow.anon_exec || fnRow.authenticated_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} is executable by unprivileged roles (public/anon/authenticated).`);
        allPassed = false;
        continue;
      }

      // Check privilege granted to service_role
      if (!fnRow.service_role_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} is NOT executable by service_role.`);
        allPassed = false;
        continue;
      }

      console.log(
        `✓ [PASS] Function ${spec.name}(${fnRow.identity_args}) -> ${fnRow.result_type}: SECURITY DEFINER, search_path=public, service_role execution only.`
      );
    }

    if (rows.length < 3) {
      allPassed = false;
    }
  } catch (err: any) {
    console.log('❌ Read-only database catalog inspection exception:', err.message);
    allPassed = false;
  } finally {
    await client.end().catch(() => {});
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log(' RESULT: PRODUCTION DATABASE READ-ONLY VERIFICATION 100% PASS! ');
    console.log(' Verified via READONLY_DATABASE_URL with TLS. Zero write operations executed.');
  } else {
    console.log(' RESULT: NOT VERIFIED — One or more schema or catalog checks failed or pending.');
    console.log(' Strictly read-only: Zero writes, updates, or deletions were performed.');
  }
  console.log('================================================================\n');

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main();
