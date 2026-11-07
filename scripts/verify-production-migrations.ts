/**
 * DocuNexa — Production Migration & Security Verification CLI (Read-Only)
 *
 * Strictly read-only verification of live Supabase database state:
 * 1. payment_orders schema, columns and accessible table structure
 * 2. account_login_attempts table existence, columns and service_role access
 * 3. admin_audit_logs table existence, columns and schema integrity
 * 4. admin_users table and administrative configuration
 * 5. Atomic lockout and admin unlock RPC functions availability
 *
 * ZERO destructive operations, ZERO simulated user lockouts, ZERO fake records.
 *
 * Usage:
 *   npx tsx scripts/verify-production-migrations.ts
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local without exposing values
try {
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
} catch (e: any) {
  console.log('Error reading .env.local:', e.message);
}

import { createAdminSupabaseClient } from '../src/lib/supabase/server';

async function main() {
  console.log('\n================================================================');
  console.log(' DOCUNEXA — PRODUCTION DATABASE READ-ONLY VERIFICATION AUDIT    ');
  console.log('================================================================\n');

  const supabase = createAdminSupabaseClient();
  let allPassed = true;

  // 1. Verify payment_orders table and structure
  console.log('--- 1. PAYMENT ORDERS TABLE & REILS READ-ONLY CHECK ---');
  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select('id, user_id, order_id, product, currency, network, base_amount_usd, payment_amount_usdt, destination_address, status, expires_at, created_at')
      .limit(1);

    if (error) {
      console.log('❌ payment_orders read error:', error.code, error.message);
      allPassed = false;
    } else {
      console.log('✓ [PASS] payment_orders table exists, columns accessible, service_role authorized.');
    }
  } catch (err: any) {
    console.log('❌ payment_orders exception:', err.message);
    allPassed = false;
  }

  // 2. Verify account_login_attempts table, columns & RLS
  console.log('\n--- 2. ACCOUNT LOGIN ATTEMPTS (5-ATTEMPT LOCKOUT) AUDIT ---');
  try {
    const { data, error } = await supabase
      .from('account_login_attempts')
      .select('email, failed_attempts, is_locked, locked_at, locked_reason, unlocked_at, unlocked_by, last_ip, created_at, updated_at')
      .limit(1);

    if (error) {
      console.log('❌ account_login_attempts table check FAILED:', error.code, error.message);
      allPassed = false;
    } else {
      console.log('✓ [PASS] account_login_attempts table exists with all durable lockout columns.');
    }
  } catch (err: any) {
    console.log('❌ account_login_attempts exception:', err.message);
    allPassed = false;
  }

  // 3. Verify admin_audit_logs table and append-only structure
  console.log('\n--- 3. ADMINISTRATIVE AUDIT LOGS AUDIT ---');
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('id, admin_user_id, action, target_user_id, metadata, reason, created_at')
      .limit(1);

    if (error) {
      console.log('❌ admin_audit_logs table check FAILED:', error.code, error.message);
      allPassed = false;
    } else {
      console.log('✓ [PASS] admin_audit_logs table exists and append-only structure is accessible.');
    }
  } catch (err: any) {
    console.log('❌ admin_audit_logs exception:', err.message);
    allPassed = false;
  }

  // 4. Verify admin_users configuration
  console.log('\n--- 4. ADMINISTRATOR AUTHORIZATION REGISTRY AUDIT ---');
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id, created_at')
      .limit(5);

    if (error) {
      console.log('❌ admin_users query FAILED:', error.code, error.message);
      allPassed = false;
    } else {
      const adminCount = data ? data.length : 0;
      console.log(`✓ [PASS] admin_users table active with ${adminCount} verified administrator(s).`);
    }
  } catch (err: any) {
    console.log('❌ admin_users exception:', err.message);
    allPassed = false;
  }

  // 5. Verify atomic lockout function existence (Strictly Read-Only via Catalog)
  console.log('\n--- 5. ATOMIC POSTGRESQL FUNCTION CATALOG AUDIT (READ-ONLY) ---');
  let functionsVerified = false;

  // Strict requirement: Prefer READONLY_DATABASE_URL only.
  // Do NOT silently use a general-purpose DATABASE_URL as a supposedly read-only credential.
  const readonlyConnStr = process.env.READONLY_DATABASE_URL;

  if (readonlyConnStr) {
    try {
      // Dynamic import to avoid hard dependency if pg driver is not present in all environments
      // @ts-ignore
      const pgModule: any = await import('pg').catch(() => null);
      if (!pgModule?.Client) {
        throw new Error('PostgreSQL driver (pg) is not available in environment');
      }
      const Client = pgModule.Client;
      const client = new Client({
        connectionString: readonlyConnStr,
        ssl: {
          rejectUnauthorized: true,
          ca: process.env.DATABASE_CA || process.env.SUPABASE_SSL_CERT || undefined,
        },
      });

      await client.connect();

      // Query pg_proc catalog for exact signature, SECURITY DEFINER, search_path, and privileges
      const catalogQuery = `
        SELECT
          p.proname,
          pg_get_function_identity_arguments(p.oid) AS identity_args,
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

      const res = await client.query(catalogQuery);
      await client.end();

      const requiredFuncs = [
        {
          name: 'record_failed_login_attempt',
          expectedArgTypes: ['text', 'text', 'integer'],
        },
        {
          name: 'record_successful_login',
          expectedArgTypes: ['text'],
        },
        {
          name: 'admin_unlock_account',
          expectedArgTypes: ['text', 'text', 'text'],
        },
      ];

      const rows = res.rows || [];
      let allFuncsValid = true;

      for (const req of requiredFuncs) {
        const found = rows.find((r: any) => r.proname === req.name);
        if (!found) {
          console.log(`⚠️ [NOT VERIFIED] Function ${req.name} not found in PostgreSQL catalog.`);
          allFuncsValid = false;
          continue;
        }

        // Verify arguments
        const argsStr = (found.identity_args || '').toLowerCase();
        const argsMatch = req.expectedArgTypes.every((t) => argsStr.includes(t));
        if (!argsMatch) {
          console.log(`❌ [FAIL] Function ${req.name} signature mismatch. Found: (${found.identity_args})`);
          allFuncsValid = false;
          continue;
        }

        // Verify SECURITY DEFINER
        if (!found.is_security_definer) {
          console.log(`❌ [FAIL] Function ${req.name} is NOT marked SECURITY DEFINER.`);
          allFuncsValid = false;
          continue;
        }

        // Verify fixed search_path = public
        const configs = found.config || [];
        const hasFixedPath = configs.some((c: string) => c.toLowerCase().includes('search_path=public'));
        if (!hasFixedPath) {
          console.log(`❌ [FAIL] Function ${req.name} lacks fixed search_path = public.`);
          allFuncsValid = false;
          continue;
        }

        // Verify execution privileges: revoked from public/anon/authenticated, granted to service_role
        if (found.public_exec || found.anon_exec || found.authenticated_exec) {
          console.log(`❌ [FAIL] Function ${req.name} is accessible to unprivileged roles (public/anon/auth).`);
          allFuncsValid = false;
          continue;
        }
        if (!found.service_role_exec) {
          console.log(`❌ [FAIL] Function ${req.name} is NOT executable by service_role.`);
          allFuncsValid = false;
          continue;
        }

        console.log(`✓ [PASS] Function ${req.name}(${found.identity_args}) verified: SECURITY DEFINER, search_path=public, service_role execution only.`);
      }

      if (allFuncsValid && rows.length >= 3) {
        functionsVerified = true;
      }
    } catch (pgErr: any) {
      console.log('⚠️ [NOT VERIFIED] Read-only catalog query failed:', pgErr.message);
    }
  } else {
    // READONLY_DATABASE_URL is not set
    if (process.env.DATABASE_URL) {
      console.log('⚠️ [WARNING] General-purpose DATABASE_URL is set, but READONLY_DATABASE_URL is strictly required.');
      console.log('             General-purpose connection strings will NOT be silently used as read-only credentials.');
    }
    console.log('⚠️ [NOT VERIFIED] Atomic RPC functions cannot be catalog-verified without READONLY_DATABASE_URL.');
    console.log('                 In accordance with strict release rules, zero write probes or test records were executed.');
    console.log('                 Status: NOT VERIFIED (pending migration application or READONLY_DATABASE_URL configuration).');
  }

  if (!functionsVerified) {
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log(' RESULT: PRODUCTION DATABASE READ-ONLY VERIFICATION 100% PASS! ');
    console.log(' Strictly read-only audit: zero test orders, probes, or customer lockouts generated.');
  } else {
    console.log(' RESULT: NOT VERIFIED — Pending production migration or read-only catalog connection.');
    console.log(' Strictly read-only: Zero writes, updates, or deletions were performed.');
  }
  console.log('================================================================\n');

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main();
