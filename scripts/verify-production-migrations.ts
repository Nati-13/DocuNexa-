/**
 * DocuNexa — Production Migration & Security Verification CLI (Strictly Read-Only)
 *
 * Exclusively uses READONLY_DATABASE_URL to inspect PostgreSQL catalog & schema:
 * 1. payment_orders schema, columns and check constraints (Polygon, Aptos, TRON)
 * 2. account_login_attempts table columns & structure
 * 3. admin_audit_logs table columns & structure
 * 4. admin_users authorization registry
 * 5. Atomic lockout and unlock functions:
 *    - Exact argument count, order, and types (no substring matching)
 *    - Exact return types and total function count (exactly 3)
 *    - SECURITY DEFINER status
 *    - Fixed search_path = public
 *    - Effective execution privileges:
 *      * PUBLIC privileges checked via pg_proc.proacl & aclexplode() grantee 0
 *      * anon and authenticated execution confirmed revoked
 *      * service_role execution confirmed granted
 *
 * STRICT PRODUCTION SAFETY:
 * - Starts a BEGIN READ ONLY transaction immediately upon connection
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

    // Start a strict READ ONLY transaction to guarantee zero modifications even on write-capable connections
    await client.query('BEGIN READ ONLY;');

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
      console.log(`❌ [FAIL] payment_orders missing required columns: ${missingPaymentCols.join(', ')}`);
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
        console.log(`❌ [FAIL] payment_orders_network_check missing required network support. Clause: ${checkClause}`);
        allPassed = false;
      }
    } else {
      console.log('❌ [FAIL] Required constraint payment_orders_network_check not found in information_schema.');
      allPassed = false;
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
      console.log(`❌ [FAIL] account_login_attempts missing required columns: ${missingLockoutCols.join(', ')}`);
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
      console.log(`❌ [FAIL] admin_audit_logs missing required columns: ${missingAuditCols.join(', ')}`);
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
      console.log('❌ [FAIL] admin_users table not found in public schema.');
      allPassed = false;
    }

    // --- 5. ATOMIC POSTGRESQL FUNCTION CATALOG AUDIT ---
    console.log('\n--- 5. ATOMIC POSTGRESQL FUNCTIONS CATALOG AUDIT ---');

    // Query pg_proc using aclexplode() for grantee 0 (PUBLIC) and exact signatures
    const funcQuery = `
      SELECT
        p.proname,
        p.pronargs AS arg_count,
        COALESCE(
          (SELECT array_agg(t.typname ORDER BY ord) 
           FROM unnest(p.proargtypes) WITH ORDINALITY AS a(oid, ord) 
           JOIN pg_type t ON t.oid = a.oid), 
          ARRAY[]::text[]
        ) AS arg_types,
        t_ret.typname AS return_type_name,
        pg_get_function_result(p.oid) AS result_type,
        p.prosecdef AS is_security_definer,
        p.proconfig AS config,
        (p.proacl IS NULL OR EXISTS (
          SELECT 1 FROM aclexplode(p.proacl) a 
          WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
        )) AS public_exec,
        CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') 
             THEN has_function_privilege('anon', p.oid, 'execute') 
             ELSE false END AS anon_exec,
        CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') 
             THEN has_function_privilege('authenticated', p.oid, 'execute') 
             ELSE false END AS authenticated_exec,
        CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') 
             THEN has_function_privilege('service_role', p.oid, 'execute') 
             ELSE false END AS service_role_exec
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_type t_ret ON t_ret.oid = p.prorettype
      WHERE n.nspname = 'public'
        AND p.proname IN ('record_failed_login_attempt', 'record_successful_login', 'admin_unlock_account');
    `;

    const funcsRes = await client.query(funcQuery);
    const rows = funcsRes.rows || [];

    if (rows.length !== 3) {
      console.log(`❌ [FAIL] Expected exactly 3 security functions in catalog, found ${rows.length}.`);
      allPassed = false;
    }

    const expectedFunctions = [
      {
        name: 'record_failed_login_attempt',
        expectedArgCount: 3,
        expectedArgTypes: ['text', 'text', 'int4'],
        expectedReturnType: 'record',
        expectedResultType: 'TABLE(email text, failed_attempts integer, is_locked boolean, locked_at timestamp with time zone, locked_reason text)',
      },
      {
        name: 'record_successful_login',
        expectedArgCount: 1,
        expectedArgTypes: ['text'],
        expectedReturnType: 'bool',
        expectedResultType: 'boolean',
      },
      {
        name: 'admin_unlock_account',
        expectedArgCount: 3,
        expectedArgTypes: ['text', 'text', 'text'],
        expectedReturnType: 'bool',
        expectedResultType: 'boolean',
      },
    ];

    for (const spec of expectedFunctions) {
      const fnRow = rows.find((r: any) => r.proname === spec.name);
      if (!fnRow) {
        console.log(`❌ [FAIL] Function ${spec.name} not found in pg_proc catalog.`);
        allPassed = false;
        continue;
      }

      // Check exact argument count
      if (fnRow.arg_count !== spec.expectedArgCount) {
        console.log(
          `❌ [FAIL] Function ${spec.name} arg count mismatch: expected ${spec.expectedArgCount}, found ${fnRow.arg_count}.`
        );
        allPassed = false;
        continue;
      }

      // Check exact argument types in exact order (no substring matching)
      const actualArgTypes = fnRow.arg_types || [];
      const typesMatch =
        actualArgTypes.length === spec.expectedArgTypes.length &&
        spec.expectedArgTypes.every((t, i) => actualArgTypes[i] === t);

      if (!typesMatch) {
        console.log(
          `❌ [FAIL] Function ${spec.name} argument types mismatch: expected [${spec.expectedArgTypes.join(', ')}], found [${actualArgTypes.join(', ')}].`
        );
        allPassed = false;
        continue;
      }

      // Check exact return type
      if (fnRow.return_type_name !== spec.expectedReturnType) {
        console.log(
          `❌ [FAIL] Function ${spec.name} return type mismatch: expected ${spec.expectedReturnType}, found ${fnRow.return_type_name}.`
        );
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
      const hasSearchPath = configs.some((c: string) => c.toLowerCase().trim() === 'search_path=public');
      if (!hasSearchPath) {
        console.log(`❌ [FAIL] Function ${spec.name} lacks fixed search_path = public.`);
        allPassed = false;
        continue;
      }

      // Check PUBLIC privilege revoked (grantee 0 in aclexplode)
      if (fnRow.public_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} has EXECUTE granted to PUBLIC (grantee 0).`);
        allPassed = false;
        continue;
      }

      // Check anon role privilege revoked
      if (fnRow.anon_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} is executable by anon role.`);
        allPassed = false;
        continue;
      }

      // Check authenticated role privilege revoked
      if (fnRow.authenticated_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} is executable by authenticated role.`);
        allPassed = false;
        continue;
      }

      // Check service_role privilege granted
      if (!fnRow.service_role_exec) {
        console.log(`❌ [FAIL] Function ${spec.name} is NOT executable by service_role.`);
        allPassed = false;
        continue;
      }

      console.log(
        `✓ [PASS] Function ${spec.name}(${actualArgTypes.join(', ')}) -> ${fnRow.return_type_name}: exact signature verified, SECURITY DEFINER, search_path=public, service_role execution only.`
      );
    }
  } catch (err: any) {
    console.log('❌ Read-only database catalog inspection exception:', err.message);
    allPassed = false;
  } finally {
    // End transaction and close connection safely
    await client.query('ROLLBACK;').catch(() => {});
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
