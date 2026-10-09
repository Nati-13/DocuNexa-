import fs from 'fs';
import path from 'path';

// Load .env.local
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

import { createAdminSupabaseClient } from '../src/lib/supabase/server';
import { isBootstrapAvailable, bootstrapFirstAdmin } from '../src/lib/admin/bootstrap';
import { isUserAdmin } from '../src/lib/admin/auth';
import {
  requestPasswordReset,
  verifyRecoveryCode,
  completePasswordReset,
} from '../src/lib/auth/passwordReset';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${title}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runPipeline() {
  console.log('\n======================================================');
  console.log(' DOCUNEXA — FULL AUTHENTICATION PIPELINE VERIFICATION ');
  console.log('======================================================\n');

  const admin = createAdminSupabaseClient();
  const testEmail = `test_pipeline_${Date.now()}@docunexa-test.local`;
  const testPassword = 'TestPassword123!';
  let testUserId: string | null = null;

  try {
    // 1. Verify signup creates a confirmed Auth user without confirmation email
    console.log('--- A. SERVER-SIDE SIGNUP WITH EMAIL_CONFIRM: TRUE ---');
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    assert(!createError && !!createData.user?.id, 'Creates Supabase Auth user server-side');
    testUserId = createData.user?.id || null;

    if (testUserId) {
      assert(
        !!createData.user.email_confirmed_at,
        'email_confirmed_at is set immediately (email_confirm: true, no confirmation email needed)'
      );

      // 2. Profile created with plan = free
      console.log('\n--- B. PROFILE WITH PLAN: FREE ---');
      await admin.from('profiles').upsert(
        {
          id: testUserId,
          email: testEmail,
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      assert(!!profile && profile.plan === 'free', 'Profile exists with plan = free');

      // 3. Duplicate signup truthful message check
      console.log('\n--- C. DUPLICATE SIGNUP REJECTION ---');
      const { error: dupError } = await admin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });
      const dupLower = (dupError?.message || '').toLowerCase();
      const dupCode = (dupError as any)?.code || '';
      const isDup =
        dupCode === 'email_exists' ||
        dupLower.includes('already registered') ||
        dupLower.includes('already been registered') ||
        dupLower.includes('already in use') ||
        dupLower.includes('user already exists');
      assert(isDup, 'Duplicate signup truthfully reports account already exists');

      // 4. Session sign in
      console.log('\n--- D. SESSION SIGN IN WITH PASSWORD ---');
      const { createClient } = await import('@supabase/supabase-js');
      const anonSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: sessionData, error: signInErr } = await anonSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      assert(!signInErr && !!sessionData.session, 'Sign in succeeds and session is established');
      assert(sessionData.user?.id === testUserId, 'Session user matches created user ID');
    }

    // 5. Admin Bootstrap & Protection
    console.log('\n--- E. ADMIN SETUP & BOOTSTRAP ISOLATION ---');
    const availableBefore = await isBootstrapAvailable();
    assert(availableBefore, '/admin/setup GET works while admin_users is empty (bootstrap available)');

    // Non-admin user is rejected
    if (testUserId) {
      const isNormalUserAdmin = await isUserAdmin(testUserId);
      assert(!isNormalUserAdmin, 'Normal signup user is NOT an admin (fails isUserAdmin)');
    }

    // Test bootstrap execution with user-supplied credentials
    const adminEmail = `admin_test_${Date.now()}@docunexa-test.local`;
    const adminPass = 'SuperAdminPass2026!';
    const bootRes = await bootstrapFirstAdmin({
      email: adminEmail,
      password: adminPass,
    });
    assert(bootRes.success, 'First admin bootstrap succeeds with user-supplied credentials');

    // Retrieve created admin user id
    const { data: adminList } = await admin.from('admin_users').select('user_id');
    const adminUserId = adminList?.[0]?.user_id;
    assert(!!adminUserId, 'Admin user exists in public.admin_users');

    if (adminUserId) {
      const isAdminTrue = await isUserAdmin(adminUserId);
      assert(isAdminTrue, 'Admin authorization recognizes public.admin_users');
    }

    // Verify bootstrap locks permanently
    const availableAfter = await isBootstrapAvailable();
    assert(!availableAfter, 'Bootstrap is permanently locked once public.admin_users has an admin');

    const bootAgain = await bootstrapFirstAdmin({
      email: 'another_admin@example.com',
      password: 'AnotherAdminPass123!',
    });
    assert(!bootAgain.success, 'Subsequent bootstrap attempts are strictly rejected');

    // 6. Forgot password routes
    console.log('\n--- F. FORGOT PASSWORD REQUEST / VERIFY / COMPLETE ---');
    // Test fail-closed when email service is unconfigured
    const origEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    const missingResendRes = await requestPasswordReset(testEmail, '127.0.0.1');
    assert(!missingResendRes.success, 'requestPasswordReset fails clearly when RESEND_API_KEY is unavailable');

    // Test full flow in test mode
    (process.env as any).NODE_ENV = 'test';
    const reqRes = await requestPasswordReset(testEmail, '127.0.0.1');
    assert(reqRes.success, 'requestPasswordReset generates code successfully in test environment');
    const resetCode = reqRes.debugCode;

    if (resetCode) {
      const verifyRes = await verifyRecoveryCode(testEmail, resetCode);
      assert(verifyRes.success && !!verifyRes.resetToken, 'verifyRecoveryCode succeeds and issues resetToken');

      const newPass = 'UpdatedSecurePass123!';
      const completeRes = await completePasswordReset(testEmail, verifyRes.resetToken!, newPass);
      assert(completeRes.success, 'completePasswordReset succeeds with new password');

      // Verify sign in with new password
      const { createClient } = await import('@supabase/supabase-js');
      const anonSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: newSession, error: newSignInErr } = await anonSupabase.auth.signInWithPassword({
        email: testEmail,
        password: newPass,
      });
      assert(!newSignInErr && !!newSession.session, 'Sign in succeeds with newly reset password');
    }

    // CLEANUP
    console.log('\n--- G. CLEANUP TEST DATA ---');
    if (testUserId) {
      await admin.auth.admin.deleteUser(testUserId);
      await admin.from('profiles').delete().eq('id', testUserId);
    }
    if (adminUserId) {
      await admin.from('admin_users').delete().eq('user_id', adminUserId);
      await admin.auth.admin.deleteUser(adminUserId);
      await admin.from('profiles').delete().eq('id', adminUserId);
    }
    console.log('  ✓ Cleaned up ephemeral test users from Supabase');
  } catch (err: any) {
    console.error('Test pipeline error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPipeline().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
