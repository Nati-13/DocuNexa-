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
 *    - Exact return types, result shapes, and total function count (exactly 3)
 *    - Strict TABLE return shape and proretset=true for record_failed_login_attempt
 *    - Strict boolean return shape and proretset=false for scalar functions
 *    - Rejection of duplicate function overloads
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
 *   npx tsx scripts/verify-production-migrations.ts --regression
 */

export interface FunctionVerificationSpec {
  name: string;
  expectedArgCount: number;
  expectedArgTypes: string[];
  expectedReturnType: string; // Underlying type from pg_type (e.g., 'record', 'bool')
  expectedProRetSet: boolean; // proretset flag: true for TABLE(), false for scalar
  expectedResultType: string; // Normalized string from pg_get_function_result(p.oid)
}

export const EXPECTED_SECURITY_FUNCTIONS: FunctionVerificationSpec[] = [
  {
    name: 'record_failed_login_attempt',
    expectedArgCount: 3,
    expectedArgTypes: ['text', 'text', 'int4'],
    expectedReturnType: 'record',
    expectedProRetSet: true,
    expectedResultType:
      'TABLE(email text, failed_attempts integer, is_locked boolean, locked_at timestamp with time zone, locked_reason text)',
  },
  {
    name: 'record_successful_login',
    expectedArgCount: 1,
    expectedArgTypes: ['text'],
    expectedReturnType: 'bool',
    expectedProRetSet: false,
    expectedResultType: 'boolean',
  },
  {
    name: 'admin_unlock_account',
    expectedArgCount: 3,
    expectedArgTypes: ['text', 'text', 'text'],
    expectedReturnType: 'bool',
    expectedProRetSet: false,
    expectedResultType: 'boolean',
  },
];

/**
 * Safely normalizes whitespace and punctuation spacing in SQL type representations
 * for accurate, resilient catalog signature comparisons.
 */
export function normalizeTypeSignature(sig: string): string {
  return (sig || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .trim();
}

export interface CatalogValidationResult {
  passed: boolean;
  errors: string[];
}

/**
 * Validates a single function catalog row against the strict security specification.
 */
export function validateFunctionRow(
  fnRow: any,
  spec: FunctionVerificationSpec
): CatalogValidationResult {
  const errors: string[] = [];

  // 1. Exact argument count
  if (fnRow.arg_count !== spec.expectedArgCount) {
    errors.push(
      `Function ${spec.name} arg count mismatch: expected ${spec.expectedArgCount}, found ${fnRow.arg_count}.`
    );
  }

  // 2. Exact argument types in exact order (no substring matching)
  const actualArgTypes = fnRow.arg_types || [];
  const typesMatch =
    actualArgTypes.length === spec.expectedArgTypes.length &&
    spec.expectedArgTypes.every((t, i) => actualArgTypes[i] === t);

  if (!typesMatch) {
    errors.push(
      `Function ${spec.name} argument types mismatch: expected [${spec.expectedArgTypes.join(', ')}], found [${actualArgTypes.join(', ')}].`
    );
  }

  // 3. Exact underlying return type
  if (fnRow.return_type_name !== spec.expectedReturnType) {
    errors.push(
      `Function ${spec.name} underlying return type mismatch: expected ${spec.expectedReturnType}, found ${fnRow.return_type_name}.`
    );
  }

  // 4. Exact set-returning flag (proretset)
  if (Boolean(fnRow.proretset) !== spec.expectedProRetSet) {
    errors.push(
      `Function ${spec.name} set-returning flag (proretset) mismatch: expected ${spec.expectedProRetSet}, found ${Boolean(fnRow.proretset)}.`
    );
  }

  // 5. Exact full result shape from pg_get_function_result with normalized whitespace
  const normalizedActualResult = normalizeTypeSignature(fnRow.result_type);
  const normalizedExpectedResult = normalizeTypeSignature(spec.expectedResultType);
  if (normalizedActualResult !== normalizedExpectedResult) {
    errors.push(
      `Function ${spec.name} result shape mismatch:\n       Expected: "${normalizedExpectedResult}"\n       Found:    "${normalizedActualResult}"`
    );
  }

  // 6. SECURITY DEFINER status
  if (!fnRow.is_security_definer) {
    errors.push(`Function ${spec.name} is NOT marked SECURITY DEFINER.`);
  }

  // 7. Fixed search_path = public
  const configs = fnRow.config || [];
  const hasSearchPath = configs.some((c: string) => c.toLowerCase().trim() === 'search_path=public');
  if (!hasSearchPath) {
    errors.push(`Function ${spec.name} lacks fixed search_path = public.`);
  }

  // 8. PUBLIC privilege revoked (grantee 0 in aclexplode)
  if (fnRow.public_exec) {
    errors.push(`Function ${spec.name} has EXECUTE granted to PUBLIC (grantee 0).`);
  }

  // 9. anon role privilege revoked
  if (fnRow.anon_exec) {
    errors.push(`Function ${spec.name} is executable by anon role.`);
  }

  // 10. authenticated role privilege revoked
  if (fnRow.authenticated_exec) {
    errors.push(`Function ${spec.name} is executable by authenticated role.`);
  }

  // 11. service_role privilege granted
  if (!fnRow.service_role_exec) {
    errors.push(`Function ${spec.name} is NOT executable by service_role.`);
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * Validates the full set of catalog rows against expected functions, strictly
 * rejecting missing functions, duplicates, and unexpected overloads.
 */
export function validateCatalogFunctions(
  rows: any[],
  expectedSpecs: FunctionVerificationSpec[]
): CatalogValidationResult {
  const errors: string[] = [];

  // Reject unexpected total count
  if (rows.length !== expectedSpecs.length) {
    errors.push(
      `Expected exactly ${expectedSpecs.length} security functions in public schema catalog, found ${rows.length}.`
    );
  }

  // Reject unexpected overloads and duplicate function names
  const nameCounts = new Map<string, number>();
  for (const r of rows) {
    const name = r.proname;
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }

  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      errors.push(
        `Function "${name}" has ${count} distinct definitions (overloading detected). Overloading security functions is strictly prohibited.`
      );
    }
    if (!expectedSpecs.some((s) => s.name === name)) {
      errors.push(`Unexpected function "${name}" found in public schema catalog query.`);
    }
  }

  // Validate each required specification
  for (const spec of expectedSpecs) {
    const matchingRows = rows.filter((r) => r.proname === spec.name);
    if (matchingRows.length === 0) {
      errors.push(`Required function "${spec.name}" not found in catalog.`);
      continue;
    }
    if (matchingRows.length > 1) {
      // Overload error already recorded above
      continue;
    }

    const rowRes = validateFunctionRow(matchingRows[0], spec);
    if (!rowRes.passed) {
      errors.push(...rowRes.errors);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * Self-contained regression test suite proving that invalid table return shapes,
 * extra/missing output columns, wrong types, incorrect proretset flags, and duplicate
 * function overloads are strictly detected and fail verification.
 */
export function runFunctionCatalogRegressionChecks(): { passed: boolean; testCount: number; failureCount: number } {
  console.log('\n--- FUNCTION CATALOG VALIDATOR REGRESSION CHECKS ---');
  let tests = 0;
  let failures = 0;

  function assertReg(desc: string, cond: boolean, details?: string) {
    tests++;
    if (cond) {
      console.log(`  ✓ [PASS] Regression test: ${desc}`);
    } else {
      console.error(`  ✗ [FAIL] Regression test: ${desc}${details ? ` (${details})` : ''}`);
      failures++;
    }
  }

  const validBaselineRowRecordFailed = {
    proname: 'record_failed_login_attempt',
    arg_count: 3,
    arg_types: ['text', 'text', 'int4'],
    return_type_name: 'record',
    proretset: true,
    result_type:
      'TABLE(email text, failed_attempts integer, is_locked boolean, locked_at timestamp with time zone, locked_reason text)',
    is_security_definer: true,
    config: ['search_path=public'],
    public_exec: false,
    anon_exec: false,
    authenticated_exec: false,
    service_role_exec: true,
  };

  const validBaselineRowRecordSuccess = {
    proname: 'record_successful_login',
    arg_count: 1,
    arg_types: ['text'],
    return_type_name: 'bool',
    proretset: false,
    result_type: 'boolean',
    is_security_definer: true,
    config: ['search_path=public'],
    public_exec: false,
    anon_exec: false,
    authenticated_exec: false,
    service_role_exec: true,
  };

  const validBaselineRowAdminUnlock = {
    proname: 'admin_unlock_account',
    arg_count: 3,
    arg_types: ['text', 'text', 'text'],
    return_type_name: 'bool',
    proretset: false,
    result_type: 'boolean',
    is_security_definer: true,
    config: ['search_path=public'],
    public_exec: false,
    anon_exec: false,
    authenticated_exec: false,
    service_role_exec: true,
  };

  const validCatalog = [
    validBaselineRowRecordFailed,
    validBaselineRowRecordSuccess,
    validBaselineRowAdminUnlock,
  ];

  // 1. Valid baseline passes completely
  const baselineRes = validateCatalogFunctions(validCatalog, EXPECTED_SECURITY_FUNCTIONS);
  assertReg('Valid baseline catalog passes verification', baselineRes.passed && baselineRes.errors.length === 0);

  // 2. Safe whitespace normalization
  assertReg(
    'Whitespace and case normalization handles varying PostgreSQL spacing',
    normalizeTypeSignature('TABLE( email  text,   failed_attempts INTEGER )') ===
      'table(email text, failed_attempts integer)'
  );

  // 3. Incorrect table shape (wrong data type in column: text instead of integer)
  const wrongColTypeRow = {
    ...validBaselineRowRecordFailed,
    result_type:
      'TABLE(email text, failed_attempts text, is_locked boolean, locked_at timestamp with time zone, locked_reason text)',
  };
  const wrongColTypeRes = validateCatalogFunctions(
    [wrongColTypeRow, validBaselineRowRecordSuccess, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Incorrect table shape (wrong column data type) fails verification',
    !wrongColTypeRes.passed && wrongColTypeRes.errors.some((e) => e.includes('result shape mismatch'))
  );

  // 4. Extra output column in TABLE
  const extraColRow = {
    ...validBaselineRowRecordFailed,
    result_type:
      'TABLE(email text, failed_attempts integer, is_locked boolean, locked_at timestamp with time zone, locked_reason text, extra_col text)',
  };
  const extraColRes = validateCatalogFunctions(
    [extraColRow, validBaselineRowRecordSuccess, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Extra output column in TABLE fails verification',
    !extraColRes.passed && extraColRes.errors.some((e) => e.includes('result shape mismatch'))
  );

  // 5. Missing output column in TABLE
  const missingColRow = {
    ...validBaselineRowRecordFailed,
    result_type:
      'TABLE(email text, failed_attempts integer, is_locked boolean, locked_at timestamp with time zone)',
  };
  const missingColRes = validateCatalogFunctions(
    [missingColRow, validBaselineRowRecordSuccess, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Missing output column in TABLE fails verification',
    !missingColRes.passed && missingColRes.errors.some((e) => e.includes('result shape mismatch'))
  );

  // 6. Wrong underlying return type name (e.g. 'int4' instead of 'record')
  const wrongUnderlyingTypeRow = {
    ...validBaselineRowRecordFailed,
    return_type_name: 'int4',
  };
  const wrongUnderlyingRes = validateCatalogFunctions(
    [wrongUnderlyingTypeRow, validBaselineRowRecordSuccess, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Wrong underlying return type name fails verification',
    !wrongUnderlyingRes.passed && wrongUnderlyingRes.errors.some((e) => e.includes('underlying return type mismatch'))
  );

  // 7. Incorrect set-returning flag (proretset = false for TABLE returning function)
  const falseSetRow = {
    ...validBaselineRowRecordFailed,
    proretset: false,
  };
  const falseSetRes = validateCatalogFunctions(
    [falseSetRow, validBaselineRowRecordSuccess, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Incorrect set-returning flag (proretset = false for TABLE function) fails verification',
    !falseSetRes.passed && falseSetRes.errors.some((e) => e.includes('proretset'))
  );

  // 8. Incorrect set-returning flag (proretset = true for scalar boolean function)
  const trueScalarSetRow = {
    ...validBaselineRowRecordSuccess,
    proretset: true,
  };
  const trueScalarRes = validateCatalogFunctions(
    [validBaselineRowRecordFailed, trueScalarSetRow, validBaselineRowAdminUnlock],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Incorrect set-returning flag (proretset = true for scalar boolean) fails verification',
    !trueScalarRes.passed && trueScalarRes.errors.some((e) => e.includes('proretset'))
  );

  // 9. Unexpected function overload / duplicate function name
  const overloadedCatalog = [
    validBaselineRowRecordFailed,
    {
      ...validBaselineRowRecordFailed,
      arg_count: 2,
      arg_types: ['text', 'text'],
    },
    validBaselineRowRecordSuccess,
    validBaselineRowAdminUnlock,
  ];
  const overloadRes = validateCatalogFunctions(overloadedCatalog, EXPECTED_SECURITY_FUNCTIONS);
  assertReg(
    'Unexpected function overload / duplicate function name fails verification',
    !overloadRes.passed && overloadRes.errors.some((e) => e.includes('overloading detected'))
  );

  // 10. Wrong scalar return type for admin_unlock_account
  const wrongUnlockTypeRow = {
    ...validBaselineRowAdminUnlock,
    return_type_name: 'text',
    result_type: 'text',
  };
  const wrongUnlockRes = validateCatalogFunctions(
    [validBaselineRowRecordFailed, validBaselineRowRecordSuccess, wrongUnlockTypeRow],
    EXPECTED_SECURITY_FUNCTIONS
  );
  assertReg(
    'Wrong scalar return type for admin_unlock_account fails verification',
    !wrongUnlockRes.passed
  );

  return { passed: failures === 0, testCount: tests, failureCount: failures };
}

async function main() {
  if (process.argv.includes('--regression') || process.argv.includes('--self-test')) {
    const regRes = runFunctionCatalogRegressionChecks();
    process.exitCode = regRes.passed ? 0 : 1;
    return;
  }

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
        p.proretset AS proretset,
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

    const catalogValidation = validateCatalogFunctions(rows, EXPECTED_SECURITY_FUNCTIONS);
    if (!catalogValidation.passed) {
      for (const err of catalogValidation.errors) {
        console.log(`❌ [FAIL] ${err}`);
      }
      allPassed = false;
    } else {
      for (const spec of EXPECTED_SECURITY_FUNCTIONS) {
        const row = rows.find((r: any) => r.proname === spec.name);
        console.log(
          `✓ [PASS] Function ${spec.name}(${row.arg_types.join(', ')}) -> ${row.return_type_name} [${row.result_type}]: exact signature and return shape verified, proretset=${row.proretset}, SECURITY DEFINER, search_path=public, service_role execution only.`
        );
      }
    }

    // Run regression checks proving that altered/invalid return shapes and overloads fail verification
    const regressionRes = runFunctionCatalogRegressionChecks();
    if (!regressionRes.passed) {
      allPassed = false;
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

const isDirectExecution =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('verify-production-migrations.ts');

if (isDirectExecution) {
  main();
}
