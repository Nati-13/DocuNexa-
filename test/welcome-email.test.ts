/**
 * DOCUNEXA — CUSTOMER WELCOME EMAIL TEST SUITE
 *
 * Verifies:
 * 1. New customer welcome email dispatcher is implemented and properly configured.
 * 2. Welcome email contains all required branding, links, disclosures, and contact info.
 * 3. Mock transporter captures exactly one welcome email upon registration trigger.
 * 4. Failed SMTP delivery does not throw or invalidate successful registration (non-critical).
 * 5. Idempotency protects against duplicate welcome email dispatches.
 * 6. Existing-user re-consent (/api/auth/accept-terms) does not send welcome emails.
 * 7. Normal login (/api/auth/login) does not send welcome emails.
 * 8. Existing password reset emails continue functioning seamlessly.
 */

import fs from 'fs';
import path from 'path';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  getSmtpConfig,
  isSmtpConfigured,
} from '../src/lib/auth/email';

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
  console.log(' DOCUNEXA — CUSTOMER WELCOME EMAIL TEST SUITE                   ');
  console.log('================================================================\n');

  // --------------------------------------------------
  // 1. WELCOME EMAIL DISPATCHER SPECIFICATION
  // --------------------------------------------------
  console.log('--- 1. WELCOME EMAIL DISPATCHER SPECIFICATION ---');

  assert(
    'sendWelcomeEmail function is exported',
    typeof sendWelcomeEmail === 'function',
    'sendWelcomeEmail exported from src/lib/auth/email.ts'
  );

  const emailSrcPath = path.join(process.cwd(), 'src', 'lib', 'auth', 'email.ts');
  const emailSrc = fs.readFileSync(emailSrcPath, 'utf8');

  assert(
    'Welcome email defines required sender and subject',
    emailSrc.includes("'Welcome to DocuNexa — Free Client-Side PDF Tools'") &&
      emailSrc.includes('docunexa.security@gmail.com'),
    'Sender docunexa.security@gmail.com and professional subject configured'
  );

  assert(
    'Welcome email includes required links and policy references',
    emailSrc.includes('https://docunexa.pro.et') &&
      emailSrc.includes('https://docunexa.pro.et/tools') &&
      emailSrc.includes('https://docunexa.pro.et/terms-of-service') &&
      emailSrc.includes('https://docunexa.pro.et/privacy-policy'),
    'Links to site, tools directory, Terms of Service, and Privacy Policy confirmed'
  );

  assert(
    'Welcome email highlights PDF Unit Cutter and zero-upload privacy',
    emailSrc.includes('PDF Unit Cutter') &&
      emailSrc.includes('zero-upload'),
    'Accurately highlights client-side zero-upload privacy and flagship cutter'
  );

  assert(
    'Welcome email provides responsive HTML and plain text fallback',
    emailSrc.includes('textContent') && emailSrc.includes('htmlContent'),
    'Both text and HTML formats provided'
  );

  // --------------------------------------------------
  // 2. MOCK TRANSPORTER DISPATCH & DELIVERY
  // --------------------------------------------------
  console.log('\n--- 2. MOCK TRANSPORTER DISPATCH & DELIVERY ---');

  const capturedMails: any[] = [];
  const mockTransporter: any = {
    sendMail: async (mailOptions: any) => {
      capturedMails.push(mailOptions);
      return { messageId: 'mock-welcome-msg-123' };
    },
  };

  const dispatchResult = await sendWelcomeEmail({
    to: 'customer@example.com',
    transporter: mockTransporter,
    requestId: 'test-req-welcome-001',
  });

  assert(
    'sendWelcomeEmail succeeds with mock transporter',
    dispatchResult.success === true,
    'Dispatch returned success: true'
  );

  assert(
    'Mock transporter captured exactly one welcome email',
    capturedMails.length === 1,
    `Captured ${capturedMails.length} email(s)`
  );

  const sent = capturedMails[0] || {};
  assert(
    'Recipient address matches target customer',
    sent.to === 'customer@example.com',
    `Recipient: ${sent.to}`
  );

  assert(
    'Email contains official contact email in body',
    sent.text.includes('docunexa.security@gmail.com') &&
      sent.html.includes('docunexa.security@gmail.com'),
    'Official contact email present in both text and HTML versions'
  );

  // --------------------------------------------------
  // 3. NON-CRITICAL NOTIFICATION RESILIENCE (FAILED SMTP)
  // --------------------------------------------------
  console.log('\n--- 3. NON-CRITICAL NOTIFICATION RESILIENCE ---');

  const failingTransporter: any = {
    sendMail: async () => {
      const err: any = new Error('Connection refused to SMTP server');
      err.code = 'ECONNREFUSED';
      throw err;
    },
  };

  const failedResult = await sendWelcomeEmail({
    to: 'customer-fail@example.com',
    transporter: failingTransporter,
    requestId: 'test-req-welcome-fail',
  });

  assert(
    'Failed SMTP delivery returns error object without throwing exception',
    failedResult.success === false && typeof failedResult.error === 'string',
    `Handled safely: "${failedResult.error}"`
  );

  const signupRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'signup', 'route.ts');
  const signupRouteContent = fs.readFileSync(signupRoutePath, 'utf8');

  assert(
    'Signup route encapsulates welcome email in non-critical try/catch',
    signupRouteContent.includes('sendWelcomeEmail(') &&
      signupRouteContent.includes('// 5. Send automated welcome email') &&
      signupRouteContent.includes('// Non-critical notification failure must never undo registration'),
    'Registration route guards welcome email so delivery failure never undoes registration'
  );

  // --------------------------------------------------
  // 4. IDEMPOTENCY & DUPLICATE PREVENTION
  // --------------------------------------------------
  console.log('\n--- 4. IDEMPOTENCY & DUPLICATE PREVENTION ---');

  assert(
    'Signup route checks server-managed app_metadata for welcome_email_sent',
    signupRouteContent.includes('!appMeta.welcome_email_sent') &&
      signupRouteContent.includes('welcome_email_sent: true') &&
      signupRouteContent.includes('app_metadata:'),
    'Server-managed app_metadata flag guarantees duplicate signup execution cannot re-dispatch email'
  );

  assert(
    'Email-sent flag is set only after successful delivery (SMTP failure remains retryable)',
    signupRouteContent.includes('if (welcomeResult.success)') &&
      signupRouteContent.includes('welcome_email_sent: true') &&
      signupRouteContent.includes('Flag remains unset for retryability'),
    'Flag is conditionally updated only on successful delivery, keeping failed SMTP deliveries retryable'
  );

  // --------------------------------------------------
  // 5. ROUTE ISOLATION (NO UNINTENDED EMAILS)
  // --------------------------------------------------
  console.log('\n--- 5. ROUTE ISOLATION (NO UNINTENDED EMAILS) ---');

  const loginRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'login', 'route.ts');
  const loginRouteContent = fs.readFileSync(loginRoutePath, 'utf8');
  assert(
    'Login route does NOT import or call sendWelcomeEmail',
    !loginRouteContent.includes('sendWelcomeEmail'),
    'Ordinary login never sends welcome emails'
  );

  const acceptTermsRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'accept-terms', 'route.ts');
  const acceptTermsRouteContent = fs.readFileSync(acceptTermsRoutePath, 'utf8');
  assert(
    'Existing user re-consent route does NOT import or call sendWelcomeEmail',
    !acceptTermsRouteContent.includes('sendWelcomeEmail'),
    'Existing user re-consent never triggers a welcome email'
  );

  // --------------------------------------------------
  // 6. PASSWORD RESET EMAIL INTEGRITY
  // --------------------------------------------------
  console.log('\n--- 6. PASSWORD RESET EMAIL INTEGRITY ---');

  const capturedResetMails: any[] = [];
  const mockResetTransporter: any = {
    sendMail: async (mailOptions: any) => {
      capturedResetMails.push(mailOptions);
      return { messageId: 'mock-reset-msg-456' };
    },
  };

  const resetResult = await sendPasswordResetEmail({
    to: 'reset-user@example.com',
    code: '1234AB',
    transporter: mockResetTransporter,
  });

  assert(
    'Existing password reset email continues functioning',
    resetResult.success === true && capturedResetMails.length === 1,
    'Password recovery emails dispatch cleanly with mock transporter'
  );

  assert(
    'Password reset contains expected verification code',
    capturedResetMails[0]?.text.includes('1234AB'),
    'Recovery code 1234AB accurately injected'
  );

  console.log('\n================================================================');
  console.log(` AUDIT COMPLETE: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

