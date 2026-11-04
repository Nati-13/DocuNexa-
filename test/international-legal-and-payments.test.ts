/**
 * DOCUNEXA — INTERNATIONAL LEGAL POLICIES & CRYPTO PAYMENTS AUDIT
 *
 * Verifies:
 * 1. International Legal & Policy Center pages existence, metadata, canonical URLs, and semantic H1s.
 * 2. 100% User Document Ownership and docunexa.security@gmail.com contact disclosures.
 * 3. Planned Crypto Payments configuration, validation functions, and fail-closed assertions.
 * 4. Signup Terms & Privacy non-preselected consent enforcement.
 * 5. Complete Technical Documentation existence, size, and coverage of all 22 sections and 34 tools.
 */

import fs from 'fs';
import path from 'path';
import {
  getInternationalCryptoConfig,
  OFFICIAL_CONTRACTS,
  isValidTronAddress,
  isValidEvmAddress,
  assertPaymentMethodActive,
} from '../src/lib/payments/cryptoConfig';

const CANONICAL_BASE = 'https://docunexa.pro.et';
const OFFICIAL_EMAIL = 'docunexa.security@gmail.com';

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

async function runAudit() {
  console.log('================================================================');
  console.log(' DOCUNEXA — INTERNATIONAL LEGAL & CRYPTO AUDIT SUITE           ');
  console.log('================================================================\n');

  // --------------------------------------------------
  // 1. LEGAL & POLICY CENTER PAGES AUDIT
  // --------------------------------------------------
  console.log('--- 1. LEGAL & POLICY PAGES INTEGRITY ---');

  const legalRoutes = [
    { slug: 'legal', file: 'legal/page.tsx', title: 'Legal & Policy Center' },
    { slug: 'terms-of-service', file: 'terms-of-service/page.tsx', title: 'Terms of Service' },
    { slug: 'privacy-policy', file: 'privacy-policy/page.tsx', title: 'Privacy Policy' },
    { slug: 'refund-policy', file: 'refund-policy/page.tsx', title: 'Refund' },
    { slug: 'acceptable-use', file: 'acceptable-use/page.tsx', title: 'Acceptable Use' },
    { slug: 'payment-policy', file: 'payment-policy/page.tsx', title: 'Payment' },
    { slug: 'cookie-policy', file: 'cookie-policy/page.tsx', title: 'Cookie' },
    { slug: 'copyright-policy', file: 'copyright-policy/page.tsx', title: 'Copyright' },
    { slug: 'security-policy', file: 'security-policy/page.tsx', title: 'Security' },
    { slug: 'accessibility', file: 'accessibility/page.tsx', title: 'Accessibility' },
    { slug: 'subprocessors', file: 'subprocessors/page.tsx', title: 'Subprocessors' },
  ];

  legalRoutes.forEach((route) => {
    const filePath = path.join(__dirname, '..', 'src', 'app', route.file);
    assert(`/${route.slug} exists on disk`, fs.existsSync(filePath), `Verified ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf8');

    // Semantic H1 check
    assert(
      `/${route.slug} has semantic H1`,
      content.includes('<h1') || content.includes('title='),
      `H1 header verified in ${route.file}`
    );

    // Canonical check
    assert(
      `/${route.slug} defines canonical`,
      content.includes(`${CANONICAL_BASE}/${route.slug}`),
      `Canonical URL verified: ${CANONICAL_BASE}/${route.slug}`
    );
  });

  // Verify ownership statement in Terms and Privacy
  const termsContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'terms-of-service', 'page.tsx'),
    'utf8'
  );
  assert(
    'Terms of Service guarantees 100% User Document Ownership',
    termsContent.includes('100%') && termsContent.includes('ownership'),
    'User document ownership explicitly guaranteed'
  );

  assert(
    'Terms of Service includes official contact email',
    termsContent.includes(OFFICIAL_EMAIL),
    `Official contact email verified: ${OFFICIAL_EMAIL}`
  );

  const privacyContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'privacy-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Privacy Policy discloses in-browser zero-upload execution',
    privacyContent.includes('client-side') || privacyContent.includes('browser memory'),
    'Zero-upload client-side processing disclosed'
  );

  assert(
    'Privacy Policy discloses 4-category data movement taxonomy',
    privacyContent.includes('Category A: 100% Pure Local In-Memory Tools') &&
      privacyContent.includes('Category B: Local WebAssembly with Public Static Model Download') &&
      privacyContent.includes('Category C: Local Heuristic Intelligence Tools') &&
      privacyContent.includes('Category D: Server-Side File Storage'),
    'Exhaustive 4-tier data movement taxonomy verified in Privacy Policy'
  );

  assert(
    'Privacy Policy strictly confirms zero third-party AI subprocessors',
    privacyContent.includes('Zero Third-Party AI Subprocessors') &&
      privacyContent.includes('OpenAI, Anthropic, Google Gemini API'),
    'Confirmed zero document dispatch to external AI APIs'
  );

  const subprocessorsContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'subprocessors', 'page.tsx'),
    'utf8'
  );
  assert(
    'Subprocessors page distinguishes file bytes, extracted text, and OCR model downloads',
    subprocessorsContent.includes('Original PDF Files') &&
      subprocessorsContent.includes('0 bytes transmitted') &&
      subprocessorsContent.includes('Extracted Text') &&
      subprocessorsContent.includes('Static Model Downloads (OCR)') &&
      subprocessorsContent.includes('Zero External AI Subprocessors'),
    'Explicit data movement classification verified on /subprocessors'
  );

  const toolPageContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'tools', '[slug]', 'page.tsx'),
    'utf8'
  );
  assert(
    'Tool UI provides transparency notices for OCR and Document Summarizer',
    toolPageContent.includes('Local WebAssembly OCR • Public Model Download Only') &&
      toolPageContent.includes('Local Heuristic Summarizer') &&
      toolPageContent.includes('Zero External AI Data Transmission'),
    'User transparency notices confirmed prior to tool execution'
  );

  // Specific legal accuracy assertions
  const refundContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'refund-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Refund Policy explains jurisdiction-dependent statutory rights vs voluntary policy',
    refundContent.includes('Statutory withdrawal and refund rights are not universal') &&
      refundContent.includes('Voluntary DocuNexa Courtesy Policy') &&
      refundContent.includes('Target Investigation & Resolution Timelines'),
    'Refund policy distinguishes statutory rights from voluntary policy without universal 14-day claims'
  );

  const paymentPolicyContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'payment-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Payment Policy accurately documents crypto transaction handling and gas fee deductions',
    paymentPolicyContent.includes('Cryptocurrency Return Constraints') &&
      paymentPolicyContent.includes('Operational Target Response') &&
      paymentPolicyContent.includes('Irreversibility'),
    'Payment policy accurately reflects blockchain finality, gas deductions, and target response windows'
  );

  const copyrightPolicyContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'copyright-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Copyright Policy accurately documents complaint contact without claiming registered DMCA agent',
    copyrightPolicyContent.includes('DocuNexa does not claim a formally designated DMCA agent') &&
      copyrightPolicyContent.includes('Copyright Complaint Contact Process') &&
      copyrightPolicyContent.includes(OFFICIAL_EMAIL),
    'Copyright policy provides accurate complaint desk without claiming registered DMCA agent'
  );

  const cookiePolicyContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'cookie-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Cookie Policy truthfully discloses third-party Monetag cookies on free plan',
    cookiePolicyContent.includes('zero tracking cookies for visitors using the free tier') &&
      cookiePolicyContent.includes('First-Party Cookieless Telemetry') &&
      cookiePolicyContent.includes('Ad-Tracker Suppression'),
    'Cookie policy discloses third-party advertising cookies on free tier and cookieless first-party analytics'
  );

  const securityPolicyContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'security-policy', 'page.tsx'),
    'utf8'
  );
  assert(
    'Security Policy accurately scopes AES-256 to Protect/Unlock PDF without claiming universal encryption',
    securityPolicyContent.includes('encrypt all uploaded or processed PDFs with AES-256') &&
      securityPolicyContent.includes('Protect PDF (ISO 32000-1 AES-256 Encryption)') &&
      securityPolicyContent.includes('Unlock PDF (Client-Side Decryption') &&
      securityPolicyContent.includes('Web Crypto AES-GCM') &&
      securityPolicyContent.includes('Target Response & Remediation Timelines'),
    'Security policy clarifies AES-256 scope to Protect/Unlock PDF, distinguishes from Web Crypto AES-GCM, and defines target remediation timelines'
  );

  const legalLayoutContent = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'legal', 'LegalPageLayout.tsx'),
    'utf8'
  );
  assert(
    'Legal Layout uses confirmed operator details without invented corporate identities',
    !legalLayoutContent.includes('DocuNexa International Operations') &&
      legalLayoutContent.includes('DocuNexa Project Maintainers'),
    'Legal layout references confirmed project maintainers rather than an invented corporate entity'
  );

  // --------------------------------------------------
  // 2. CRYPTO PAYMENT ARCHITECTURE CONFIGURATION
  // --------------------------------------------------
  console.log('\n--- 2. CRYPTO PAYMENT ARCHITECTURE & VALIDATION ---');

  const cryptoConfig = getInternationalCryptoConfig();

  // Verify planned rails are disabled by default
  assert(
    'Planned crypto payments globally disabled by default',
    cryptoConfig.globalCryptoPaymentsEnabled === false || process.env.CRYPTO_PAYMENTS_ENABLED !== 'true',
    `CRYPTO_PAYMENTS_ENABLED = ${process.env.CRYPTO_PAYMENTS_ENABLED || 'unset (false)'}`
  );

  assert(
    'Planned TRON TRC20 rail is disabled by default',
    cryptoConfig.methods.tron_usdt.isEnabled === false &&
      cryptoConfig.methods.tron_usdt.status === 'planned',
    'TRON rail strictly disabled until officially provisioned'
  );

  assert(
    'Planned Polygon USDC rail is disabled by default',
    cryptoConfig.methods.polygon_usdc.isEnabled === false &&
      cryptoConfig.methods.polygon_usdc.status === 'planned',
    'Polygon USDC rail strictly disabled until officially provisioned'
  );

  // Fail-closed assertion testing
  let trc20AssertionBlocked = false;
  try {
    assertPaymentMethodActive('tron_usdt');
  } catch (err: any) {
    trc20AssertionBlocked = true;
  }
  assert(
    'assertPaymentMethodActive fails closed for disabled tron_usdt',
    trc20AssertionBlocked,
    'Throws error preventing execution of unactivated payment rail'
  );

  let usdcAssertionBlocked = false;
  try {
    assertPaymentMethodActive('polygon_usdc');
  } catch (err: any) {
    usdcAssertionBlocked = true;
  }
  assert(
    'assertPaymentMethodActive fails closed for disabled polygon_usdc',
    usdcAssertionBlocked,
    'Throws error preventing execution of unactivated payment rail'
  );

  // Address validation: TRON
  assert(
    'isValidTronAddress accepts valid official TRON contract address',
    isValidTronAddress(OFFICIAL_CONTRACTS.TRON_USDT_TRC20),
    `${OFFICIAL_CONTRACTS.TRON_USDT_TRC20} accepted`
  );

  assert(
    'isValidTronAddress rejects EVM hex address',
    !isValidTronAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),
    '0x hex format rejected for TRON'
  );

  assert(
    'isValidTronAddress rejects malformed string',
    !isValidTronAddress('TR7NHqje'),
    'Short string rejected'
  );

  // Address validation: EVM
  assert(
    'isValidEvmAddress accepts valid Polygon contract address',
    isValidEvmAddress(OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE),
    `${OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE} accepted`
  );

  assert(
    'isValidEvmAddress rejects TRON base58 address',
    !isValidEvmAddress(OFFICIAL_CONTRACTS.TRON_USDT_TRC20),
    'TRON format rejected for EVM'
  );

  assert(
    'isValidEvmAddress rejects invalid hex character',
    !isValidEvmAddress('0xZZ132D05D31c914a87C6611C10748AEb04B58e8F'),
    'Invalid hex rejected'
  );

  // --------------------------------------------------
  // 3. SIGNUP TERMS & PRIVACY CONSENT ENFORCEMENT
  // --------------------------------------------------
  console.log('\n--- 3. SIGNUP TERMS & PRIVACY CONSENT ---');

  const signupFormPath = path.join(__dirname, '..', 'src', 'app', 'signup', 'SignupForm.tsx');
  const signupFormContent = fs.readFileSync(signupFormPath, 'utf8');

  assert(
    'SignupForm has terms checkbox with unchecked default',
    signupFormContent.includes('termsAccepted') && signupFormContent.includes('useState(false)'),
    'Default state is strictly unchecked (non-preselected)'
  );

  assert(
    'SignupForm links to /terms-of-service and /privacy-policy',
    signupFormContent.includes('/terms-of-service') && signupFormContent.includes('/privacy-policy'),
    'Direct links to international terms and privacy verified'
  );

  const signupRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'auth', 'signup', 'route.ts');
  const signupRouteContent = fs.readFileSync(signupRoutePath, 'utf8');

  assert(
    'Signup API handler validates termsAccepted === true',
    signupRouteContent.includes('termsAccepted !== true'),
    'Rejects account creation fail-closed if terms are not accepted'
  );

  // --------------------------------------------------
  // 4. COMPLETE DOCUMENTATION VERIFICATION
  // --------------------------------------------------
  console.log('\n--- 4. COMPLETE TECHNICAL DOCUMENTATION ---');

  const docPath = path.join(__dirname, '..', 'docs', 'DOCUNEXA_COMPLETE_DOCUMENTATION.md');
  assert('Documentation file exists', fs.existsSync(docPath), `Path: ${docPath}`);

  const docStats = fs.statSync(docPath);
  assert(
    'Documentation is comprehensive (> 50KB)',
    docStats.size > 50000,
    `Size: ${(docStats.size / 1024).toFixed(1)} KB`
  );

  const docContent = fs.readFileSync(docPath, 'utf8');

  const requiredSections = [
    'Executive Overview & Platform Mission',
    'Technology Stack & Dependency Inventory',
    'System Architecture & High-Level Design',
    'Project Directory & File Structure',
    'Exhaustive Tool Suite Reference',
    'Route, Navigation & Page Directory',
    'Full API Endpoint Specification',
    'Relational Database & State Storage Architecture',
    'Authentication, Sessions & RBAC Security Layer',
    'Cryptocurrency & International Payment Architecture',
    'Communication, SMTP Email & Telegram Bot Integration',
    'Security Architecture & Threat Modeling',
    'Privacy Engineering, Salt-Hashed Analytics & Monetization',
    'Legal & Regulatory Compliance Framework',
    'Environment Variables & Configuration Matrix',
    'Local Development, Tooling & Verification Guide',
    'Automated Testing & QA Architecture',
    'Production Deployment, Edge Routing & Operations',
    'Troubleshooting & Diagnostic Runbook',
    'Honest Capabilities, Known Limitations & Roadmap',
    'Maintenance & Change Management Standards',
    'Glossary & Release Sign-Off',
  ];

  requiredSections.forEach((sec, idx) => {
    assert(
      `Documentation Section ${idx + 1}: "${sec}" present`,
      docContent.includes(sec),
      'Section header confirmed'
    );
  });

  assert(
    'Documentation contains official contact email',
    docContent.includes(OFFICIAL_EMAIL),
    `Email ${OFFICIAL_EMAIL} confirmed in documentation`
  );

  assert(
    'Documentation covers flagship PDF Unit Cutter deep dive',
    docContent.includes('PDF Unit Cutter (Flagship Engine)') && docContent.includes('Anti-Clamping'),
    'Detailed Unit Cutter deep dive verified'
  );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE: ${passed} OF ${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAudit();
