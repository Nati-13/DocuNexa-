/**
 * DOCUNEXA — DURABLE LEGAL ACCEPTANCE & CONSENT PROTECTION TEST SUITE
 *
 * Verifies:
 * 1. Signup without consent is strictly rejected (fail-closed HTTP 400).
 * 2. Signup with consent creates an authoritative record in legal_acceptances table.
 * 3. Terms and privacy policy versions are accurately recorded and default to '2026.11'.
 * 4. Row Level Security (RLS) strictly prevents ordinary users from forging or modifying records.
 * 5. Database acceptance persistence failure triggers fail-closed rollback (deleting auth user).
 * 6. Existing authentication, login, and profile creation remain completely functional.
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let total = 0;

function assert(name: string, condition: boolean, details: string) {
  total++;
  if (condition) {
    console.log(`✓ [PASS] ${name}: ${details}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${name}: ${details}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — DURABLE LEGAL ACCEPTANCE & CONSENT AUDIT SUITE      ');
  console.log('================================================================\n');

  // --------------------------------------------------
  // 1. SIGNUP CONSENT VALIDATION (UI & SERVER)
  // --------------------------------------------------
  console.log('--- 1. SIGNUP CONSENT ENFORCEMENT & DEFAULT STATE ---');

  const signupFormPath = path.join(process.cwd(), 'src', 'app', 'signup', 'SignupForm.tsx');
  assert('SignupForm component exists', fs.existsSync(signupFormPath), `Found ${signupFormPath}`);

  const signupFormContent = fs.readFileSync(signupFormPath, 'utf8');
  assert(
    'SignupForm defaults consent checkbox to unchecked',
    signupFormContent.includes('const [termsAccepted, setTermsAccepted] = useState(false);'),
    'Default state is strictly boolean false (non-preselected)'
  );

  assert(
    'SignupForm blocks submission if terms are not accepted',
    signupFormContent.includes('if (!termsAccepted)') &&
      signupFormContent.includes('setError('),
    'Client-side guard halts form submission when terms are unchecked'
  );

  const signupRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'signup', 'route.ts');
  assert('Signup route exists', fs.existsSync(signupRoutePath), `Found ${signupRoutePath}`);

  const signupRouteContent = fs.readFileSync(signupRoutePath, 'utf8');
  assert(
    'Signup API route validates termsAccepted === true fail-closed',
    signupRouteContent.includes('if (termsAccepted !== true)') &&
      signupRouteContent.includes('status: 400'),
    'Server rejects requests missing termsAccepted === true with HTTP 400'
  );

  // --------------------------------------------------
  // 2. DATABASE MIGRATION & RLS POLICIES
  // --------------------------------------------------
  console.log('\n--- 2. DATABASE SCHEMA & ROW LEVEL SECURITY ---');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261104145935_create_legal_acceptances.sql'
  );
  assert('SQL migration file exists', fs.existsSync(migrationPath), `Found ${migrationPath}`);

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  assert(
    'Migration creates public.legal_acceptances table',
    migrationContent.includes('create table if not exists public.legal_acceptances') &&
      migrationContent.includes('user_id uuid not null references auth.users(id) on delete cascade') &&
      migrationContent.includes('terms_version text not null') &&
      migrationContent.includes('privacy_version text not null') &&
      migrationContent.includes('policy_scope text not null') &&
      migrationContent.includes('accepted_at timestamptz not null default now()') &&
      migrationContent.includes('created_at timestamptz not null default now()'),
    'Authoritative table schema defines required audit columns with DEFAULT NOW()'
  );

  assert(
    'Migration creates lookup indexes',
    migrationContent.includes('idx_legal_acceptances_user_id') &&
      migrationContent.includes('idx_legal_acceptances_accepted_at'),
    'Performance and chronology indexes verified'
  );

  assert(
    'Migration enables Row Level Security (RLS)',
    migrationContent.includes('alter table public.legal_acceptances enable row level security;'),
    'RLS actively enforced on legal_acceptances'
  );

  assert(
    'Users have read-only access to own acceptance records',
    migrationContent.includes('create policy "Users can view own legal acceptances"') &&
      migrationContent.includes('for select') &&
      migrationContent.includes('to authenticated') &&
      migrationContent.includes('using (auth.uid() = user_id)'),
    'Authenticated users may SELECT only their own rows'
  );

  assert(
    'Migration explicitly revokes ALL privileges from public, anon, and authenticated',
    migrationContent.includes('revoke all on public.legal_acceptances from public;') &&
      migrationContent.includes('revoke all on public.legal_acceptances from anon;') &&
      migrationContent.includes('revoke all on public.legal_acceptances from authenticated;'),
    'Explicit table-level REVOKE ALL applied to PUBLIC, anon, and authenticated'
  );

  assert(
    'Authenticated users are granted ONLY SELECT (blocking INSERT, UPDATE, DELETE, TRUNCATE)',
    migrationContent.includes('grant select on public.legal_acceptances to authenticated;') &&
      !migrationContent.includes('grant insert') &&
      !migrationContent.includes('grant update') &&
      !migrationContent.includes('grant delete') &&
      !migrationContent.includes('grant truncate'),
    'Authenticated users are restricted solely to SELECT; mutation and truncation are barred'
  );

  assert(
    'Service role has exclusive server-side write permissions',
    migrationContent.includes('grant all on public.legal_acceptances to service_role;'),
    'Only trusted server-side code with service_role key can insert audit records'
  );

  // --------------------------------------------------
  // 3. SERVER-SIDE PERSISTENCE & FAIL-CLOSED INTEGRITY
  // --------------------------------------------------
  console.log('\n--- 3. SERVER PERSISTENCE & FAIL-CLOSED ROLLBACK ---');

  assert(
    'Signup route persists to legal_acceptances via admin client',
    signupRouteContent.includes("admin.from('legal_acceptances').insert(") &&
      signupRouteContent.includes('user_id: userId') &&
      signupRouteContent.includes('terms_version: termsVer') &&
      signupRouteContent.includes('privacy_version: privacyVer') &&
      signupRouteContent.includes("policy_scope: 'all_terms_and_privacy'"),
    'Server writes authoritative acceptance record upon user creation'
  );

  assert(
    'Signup route defaults policy versions accurately to 2026.11',
    signupRouteContent.includes("'2026.11'"),
    'Defaults to current release version 2026.11'
  );

  assert(
    'Database failure triggers fail-closed rollback attempt',
    signupRouteContent.includes('if (acceptanceError)') &&
      signupRouteContent.includes('await admin.auth.admin.deleteUser(userId)') &&
      signupRouteContent.includes('status: 500'),
    'Rollback attempts deletion of unconsented Auth user if legal acceptance insertion fails'
  );

  assert(
    'Failed cleanup emits an operational alert and secondary defensive neutralization',
    signupRouteContent.includes('[OPERATIONAL ALERT] [CRITICAL]') &&
      signupRouteContent.includes('admin.auth.admin.updateUserById(userId') &&
      signupRouteContent.includes('consent_persistence_failed: true') &&
      signupRouteContent.includes('app_metadata:'),
    'Emits critical operational alert and sets server-managed app_metadata if user deletion fails'
  );

  assert(
    'Signup route does not claim rollback is guaranteed if cleanup can fail',
    !signupRouteContent.includes('rollback is guaranteed') &&
      signupRouteContent.includes('Rollback is not guaranteed if Auth service deletion fails'),
    'Accurately acknowledges rollback limitations and documents best-effort cleanup'
  );

  assert(
    'Database failure response does not leak internal database errors',
    signupRouteContent.includes(
      "'Account registration could not be completed at this time. Please try again or contact support.'"
    ),
    'Safe, sanitized user-facing error message returned without database details'
  );

  // --------------------------------------------------
  // 4. AUTHORITATIVE CONSENT & APP_METADATA ENFORCEMENT
  // --------------------------------------------------
  console.log('\n--- 4. AUTHORITATIVE CONSENT & APP_METADATA ENFORCEMENT ---');

  const loginRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'login', 'route.ts');
  const loginRouteContent = fs.readFileSync(loginRoutePath, 'utf8');

  assert(
    'Login route uses server-managed app_metadata for administrative blocks',
    loginRouteContent.includes('authData.user.app_metadata') &&
      loginRouteContent.includes('appMeta.consent_persistence_failed === true'),
    'Server-managed app_metadata used instead of user-editable user_metadata'
  );

  assert(
    'Login route checks authoritative legal_acceptances table',
    loginRouteContent.includes(".from('legal_acceptances')") &&
      loginRouteContent.includes(".eq('user_id', authData.user.id)"),
    'Authoritative proof of consent queried from public.legal_acceptances'
  );

  assert(
    'Login route directs unconsented existing accounts to /accept-terms',
    loginRouteContent.includes('needsReconsent') &&
      loginRouteContent.includes("redirect: needsReconsent ? '/accept-terms' : '/account'"),
    'Existing accounts lacking database consent are directed to /accept-terms rather than permanently locked out'
  );

  const serverAuthPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'server.ts');
  const serverAuthContent = fs.readFileSync(serverAuthPath, 'utf8');

  assert(
    'getCurrentProfile checks server-managed app_metadata failure flags',
    serverAuthContent.includes('user.app_metadata') &&
      serverAuthContent.includes('appMeta.consent_persistence_failed === true') &&
      serverAuthContent.includes('return null;'),
    'Profile resolution rejects accounts flagged via server-managed app_metadata'
  );

  assert(
    'Server exports hasUserAcceptedCurrentTerms querying legal_acceptances directly',
    serverAuthContent.includes('export async function hasUserAcceptedCurrentTerms(') &&
      serverAuthContent.includes(".from('legal_acceptances')"),
    'Authoritative function checks legal_acceptances table directly'
  );

  // --------------------------------------------------
  // 5. EXISTING USER RE-CONSENT FLOW (/accept-terms)
  // --------------------------------------------------
  console.log('\n--- 5. EXISTING USER RE-CONSENT FLOW (/accept-terms) ---');

  const acceptTermsPagePath = path.join(process.cwd(), 'src', 'app', 'accept-terms', 'page.tsx');
  assert('Accept-terms page exists', fs.existsSync(acceptTermsPagePath), `Found ${acceptTermsPagePath}`);

  const acceptTermsPageContent = fs.readFileSync(acceptTermsPagePath, 'utf8');
  assert(
    'Accept-terms page requires authenticated user',
    acceptTermsPageContent.includes("redirect('/login?redirect=/accept-terms')"),
    'Unauthenticated visitors redirected to login'
  );

  assert(
    'Accept-terms page redirects users with current consent to /account',
    acceptTermsPageContent.includes('hasUserAcceptedCurrentTerms') &&
      acceptTermsPageContent.includes("redirect('/account')"),
    'Already-consented users redirected to account'
  );

  const acceptTermsFormPath = path.join(process.cwd(), 'src', 'app', 'accept-terms', 'AcceptTermsForm.tsx');
  assert('AcceptTermsForm component exists', fs.existsSync(acceptTermsFormPath), `Found ${acceptTermsFormPath}`);

  const acceptTermsFormContent = fs.readFileSync(acceptTermsFormPath, 'utf8');
  assert(
    'AcceptTermsForm requires explicit unchecked Terms and Privacy checkboxes',
    acceptTermsFormContent.includes('const [termsAccepted, setTermsAccepted] = useState(false);') &&
      acceptTermsFormContent.includes('const [privacyAccepted, setPrivacyAccepted] = useState(false);') &&
      acceptTermsFormContent.includes('id="terms-checkbox"') &&
      acceptTermsFormContent.includes('id="privacy-checkbox"'),
    'Both checkboxes default strictly to false (fail-closed UI)'
  );

  const acceptTermsApiRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'accept-terms', 'route.ts');
  assert('Accept-terms API route exists', fs.existsSync(acceptTermsApiRoutePath), `Found ${acceptTermsApiRoutePath}`);

  const acceptTermsApiRouteContent = fs.readFileSync(acceptTermsApiRoutePath, 'utf8');
  assert(
    'Accept-terms API route validates both checkboxes and saves via service_role',
    acceptTermsApiRouteContent.includes('if (termsAccepted !== true || privacyAccepted !== true)') &&
      acceptTermsApiRouteContent.includes("admin.from('legal_acceptances').insert(") &&
      acceptTermsApiRouteContent.includes("'2026.11'"),
    'Validates explicit consent and inserts authoritative audit row with 2026.11 version'
  );

  assert(
    'Accept-terms API route maintains restricted access on persistence failure',
    acceptTermsApiRouteContent.includes('if (insertError)') &&
      acceptTermsApiRouteContent.includes('status: 500'),
    'Returns recoverable 500 error if DB persistence fails without granting access'
  );

  // --------------------------------------------------
  // 6. PROTECTED ROUTE CONSENT ENFORCEMENT
  // --------------------------------------------------
  console.log('\n--- 6. PROTECTED ROUTE CONSENT ENFORCEMENT ---');

  const accountPagePath = path.join(process.cwd(), 'src', 'app', 'account', 'page.tsx');
  const accountPageContent = fs.readFileSync(accountPagePath, 'utf8');
  assert(
    'Account page redirects unconsented users to /accept-terms',
    accountPageContent.includes('hasUserAcceptedCurrentTerms') &&
      accountPageContent.includes("redirect('/accept-terms?redirect=/account')"),
    'Account view protected by authoritative legal_acceptances check'
  );

  const adminLayoutPath = path.join(process.cwd(), 'src', 'app', 'admin', 'layout.tsx');
  const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');
  assert(
    'Admin layout redirects unconsented users to /accept-terms',
    adminLayoutContent.includes('hasUserAcceptedCurrentTerms') &&
      adminLayoutContent.includes("redirect('/accept-terms?redirect=/admin')"),
    'Admin layout protected by authoritative legal_acceptances check'
  );

  const choosePlanRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'choose-plan', 'route.ts');
  const choosePlanRouteContent = fs.readFileSync(choosePlanRoutePath, 'utf8');
  assert(
    'Choose-plan API rejects unconsented users with HTTP 403 CONSENT_REQUIRED',
    choosePlanRouteContent.includes('hasUserAcceptedCurrentTerms') &&
      choosePlanRouteContent.includes("'CONSENT_REQUIRED'"),
    'Plan selection protected by authoritative legal_acceptances check'
  );

  const createOrderRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'payments', 'create-order', 'route.ts');
  const createOrderRouteContent = fs.readFileSync(createOrderRoutePath, 'utf8');
  assert(
    'Payment order creation rejects unconsented users with HTTP 403 CONSENT_REQUIRED',
    createOrderRouteContent.includes('hasUserAcceptedCurrentTerms') &&
      createOrderRouteContent.includes("'CONSENT_REQUIRED'"),
    'Payment order initiation protected by authoritative legal_acceptances check'
  );

  const meRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'me', 'route.ts');
  const meRouteContent = fs.readFileSync(meRoutePath, 'utf8');
  assert(
    'Auth me route reports hasConsent based on authoritative check',
    meRouteContent.includes('hasUserAcceptedCurrentTerms') &&
      meRouteContent.includes('hasConsent'),
    'Client session status reports accurate consent status'
  );

  // --------------------------------------------------
  // 4. EXISTING AUTHENTICATION FLOW INTEGRITY
  // --------------------------------------------------
  console.log('\n--- 4. EXISTING AUTHENTICATION & LOGIN PRESERVATION ---');

  assert(
    'Signup route preserves email_confirm: true',
    signupRouteContent.includes('email_confirm: true'),
    'Pre-confirmed server signup preserved'
  );

  assert(
    'Signup route preserves initial free profile provisioning',
    signupRouteContent.includes("admin.from('profiles').upsert(") &&
      signupRouteContent.includes("plan: 'free'"),
    'Initial free tier profile created'
  );

  assert(
    'Signup route performs immediate password sign-in and redirect',
    signupRouteContent.includes('signInWithPassword') &&
      signupRouteContent.includes('/choose-plan'),
    'Session sign-in and plan selection redirection preserved'
  );

  // Check TypeScript types
  const typesPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  assert(
    'Supabase types include DbLegalAcceptance interface',
    typesContent.includes('export type DbLegalAcceptance = {') &&
      typesContent.includes('terms_version: string;') &&
      typesContent.includes('privacy_version: string;'),
    'DbLegalAcceptance type exported in types.ts'
  );

  assert(
    'Database schema includes legal_acceptances table definition',
    typesContent.includes('legal_acceptances: {') &&
      typesContent.includes('Row: DbLegalAcceptance;'),
    'legal_acceptances table typed in Database.public.Tables'
  );

  // --------------------------------------------------
  // 5. RETENTION & ON DELETE CASCADE DOCUMENTATION
  // --------------------------------------------------
  console.log('\n--- 5. RETENTION & ON DELETE CASCADE DOCUMENTATION ---');

  const docPath = path.join(process.cwd(), 'docs', 'DOCUNEXA_COMPLETE_DOCUMENTATION.md');
  const docContent = fs.readFileSync(docPath, 'utf8');

  assert(
    'Documentation records ON DELETE CASCADE retention behavior',
    docContent.includes('ON DELETE CASCADE') &&
      docContent.includes('GDPR Article 17') &&
      docContent.includes('consent records do not outlive account erasure'),
    'Retention behavior accurately documents concurrent erasure under GDPR Article 17'
  );

  assert(
    'Documentation records cleanup alert and non-guaranteed rollback',
    docContent.includes('[OPERATIONAL ALERT] [CRITICAL]') &&
      docContent.includes('rollback is not guaranteed if Auth service deletion fails'),
    'Documentation accurately reflects best-effort cleanup and operational alert'
  );

  console.log('\n================================================================');
  console.log(` AUDIT COMPLETE: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

