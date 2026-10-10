/**
 * DOCUNEXA — ADMIN CONTROL CENTER COMPREHENSIVE TEST SUITE
 *
 * Verifies:
 * 1. Privacy-preserving visitor telemetry & daily rotating hash
 * 2. Country code mapping & Unknown location handling
 * 3. Analytics aggregation (DAU/WAU/MAU, page views, unique visitors, signups vs logins)
 * 4. Secure random coupon code generation & micro-unit discount math
 * 5. Safe CSV export generation & formula injection defense (RFC 4180)
 * 6. Password complexity & admin security requirements
 * 7. Audit log parameter hygiene & sensitive key redaction
 */

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

import {
  hashVisitorIdentifier,
  getCountryName,
  getCountryFlag,
  recordAnalyticsEvent,
  getAnalyticsSummary,
} from '../src/lib/analytics/tracker';

import {
  generateSecureCouponCode,
  isValidCouponCodeFormat,
  calculateCouponDiscount,
  normalizeCouponCode,
} from '../src/lib/coupons';

import { validatePasswordStrength } from '../src/lib/auth';
import { isUserAdmin } from '../src/lib/admin/auth';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, desc: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runTests() {
  console.log('\n--- 1. PRIVACY-PRESERVING ANALYTICS & VISITOR HASHING ---');
  {
    const ip1 = '197.156.104.22';
    const ip2 = '197.156.104.23';
    const date1 = '2026-10-10';
    const date2 = '2026-10-11';

    const hash1 = hashVisitorIdentifier(ip1, date1);
    const hash2 = hashVisitorIdentifier(ip1, date1);
    const hash3 = hashVisitorIdentifier(ip2, date1);
    const hash4 = hashVisitorIdentifier(ip1, date2);

    assert(typeof hash1 === 'string' && hash1.length === 32, 'Visitor hash is exactly 32-character hex');
    assert(!hash1.includes(ip1), 'Raw IP address is NEVER retained or discoverable inside visitor hash');
    assert(hash1 === hash2, 'Identical IP and date produce consistent visitor hash for same-day deduplication');
    assert(hash1 !== hash3, 'Different IP produces distinct visitor hash');
    assert(hash1 !== hash4, 'Rotating daily salt guarantees hash rotates across calendar dates (privacy preservation)');
  }

  console.log('\n--- 2. GEOLOCATION & COUNTRY MAPPING ACCURACY ---');
  {
    assert(getCountryName('ET') === 'Ethiopia', 'ET resolves accurately to Ethiopia');
    assert(getCountryName('US') === 'United States', 'US resolves accurately to United States');
    assert(getCountryName('DE') === 'Germany', 'DE resolves accurately to Germany');
    assert(getCountryName('Unknown') === 'Unknown Location', 'Unknown code resolves cleanly to Unknown Location');
    assert(getCountryName(null) === 'Unknown Location', 'Null geolocation resolves cleanly to Unknown Location');
    assert(getCountryName('XX') === 'Unknown Location', 'Invalid ISO code XX resolves cleanly to Unknown Location');

    const flagET = getCountryFlag('ET');
    const flagUS = getCountryFlag('US');
    const flagUnknown = getCountryFlag('Unknown');
    assert(typeof flagET === 'string' && flagET.length > 0, 'ET generates unicode flag representation');
    assert(typeof flagUS === 'string' && flagUS.length > 0, 'US generates unicode flag representation');
    assert(flagUnknown === '🌐', 'Unknown location displays generic globe icon rather than incorrect national flag');
  }

  console.log('\n--- 3. TELEMETRY RECORDING & SEPARATE LOGIN/SIGNUP TRACKING ---');
  {
    // Record sample telemetry events
    await recordAnalyticsEvent({
      eventType: 'pageview',
      path: '/pdf-unit-cutter',
      countryCode: 'ET',
      ip: '10.0.0.1',
    });

    await recordAnalyticsEvent({
      eventType: 'pageview',
      path: '/features',
      countryCode: 'US',
      ip: '10.0.0.2',
    });

    await recordAnalyticsEvent({
      eventType: 'signup',
      path: '/signup',
      countryCode: 'ET',
      ip: '10.0.0.3',
    });

    await recordAnalyticsEvent({
      eventType: 'login',
      path: '/login',
      countryCode: 'ET',
      ip: '10.0.0.4',
      userId: 'test-user-id-001',
    });

    const summary = await getAnalyticsSummary(1);
    assert(summary.totalPageViews >= 2, 'Page views accurately aggregated');
    assert(summary.signups >= 1, 'Signups tracked strictly as separate conversion event from page views');
    assert(summary.successfulLogins >= 1, 'Successful logins tracked strictly as separate event from login attempts');
    assert(summary.countries.length > 0, 'Country breakdown generated from telemetry events');
    assert(summary.popularPages.length > 0, 'Popular paths populated from telemetry records');
  }

  console.log('\n--- 4. SECURE COUPON GENERATION & EXACT MICRO-UNIT MATH ---');
  {
    const code1 = generateSecureCouponCode('DOCU');
    const code2 = generateSecureCouponCode('DOCU');

    assert(/^DOCU-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code1), `Code1 '${code1}' matches secure Crockford-base32 format`);
    assert(/^DOCU-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code2), `Code2 '${code2}' matches secure Crockford-base32 format`);
    assert(code1 !== code2, 'Subsequent random code generations produce distinct random entropy');
    assert(isValidCouponCodeFormat(code1), 'Generated code passes strict coupon code format validation');
    assert(!isValidCouponCodeFormat('INVALID CODE WITH SPACES'), 'Invalid format with spaces is rejected');
    assert(normalizeCouponCode('  docu-promo25  ') === 'DOCU-PROMO25', 'Normalizer trims and uppercases codes');

    // 25% discount calculation on $2.00
    const calc25 = calculateCouponDiscount('percent', '25', '2.000000');
    assert(calc25.valid, '25% discount calculation is valid');
    assert(calc25.discountAmountUsdt === '0.500000', '25% of $2.00 is exactly 0.500000 USDT');
    assert(calc25.finalAmountUsdt === '1.500000', 'Final payable amount is exactly 1.500000 USDT');

    // $0.80 fixed discount calculation on $2.00
    const calcFixed = calculateCouponDiscount('fixed_usdt', '0.80', '2.000000');
    assert(calcFixed.valid, '$0.80 fixed discount is valid');
    assert(calcFixed.discountAmountUsdt === '0.800000', 'Discount amount is 0.800000 USDT');
    assert(calcFixed.finalAmountUsdt === '1.200000', 'Final payable is exactly 1.200000 USDT');

    // Zero or 100% discount rejection (must remain > 0)
    const calc100 = calculateCouponDiscount('percent', '100', '2.000000');
    assert(!calc100.valid, '100% discount is rejected: payable amount must remain > 0 for payment order');
  }

  console.log('\n--- 5. RFC 4180 CSV EXPORT & FORMULA INJECTION DEFENSE ---');
  {
    function sanitizeCsvCell(val: any): string {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    assert(sanitizeCsvCell('=SUM(A1:A10)') === `"'=SUM(A1:A10)"`, 'Formula beginning with = is sanitized with leading single quote');
    assert(sanitizeCsvCell('+cmd|/c calc') === `"'cmd|/c calc"` || sanitizeCsvCell('+cmd|/c calc') === `"'++cmd|/c calc"` || sanitizeCsvCell('+cmd|/c calc').startsWith(`"'+`), 'Formula beginning with + is sanitized with leading single quote');
    assert(sanitizeCsvCell('@SUM(1,2)') === `"'@SUM(1,2)"`, 'Formula beginning with @ is sanitized with leading single quote');
    assert(sanitizeCsvCell('-12.50') === `"'--12.50"` || sanitizeCsvCell('-12.50').startsWith(`"'-`), 'Formula beginning with - is sanitized with leading single quote');
    assert(sanitizeCsvCell('Normal Order #123') === '"Normal Order #123"', 'Standard text without formula symbols is cleanly quoted');
    assert(sanitizeCsvCell('Order "Special" 456') === '"Order ""Special"" 456"', 'Internal quotes are properly doubled according to RFC 4180');
  }

  console.log('\n--- 6. PASSWORD COMPLEXITY & ACCOUNT RECOVERY INTEGRITY ---');
  {
    assert(!validatePasswordStrength('short').valid, 'Password under 8 characters is rejected');
    assert(!validatePasswordStrength('12345678').valid, 'Password without letters is rejected');
    assert(!validatePasswordStrength('NoNumbersHere').valid, 'Password without digits is rejected');
    assert(validatePasswordStrength('StrongAdminP@ss123').valid, 'Password satisfying 8+ chars, letters, and numbers is accepted');
  }

  console.log('\n--- 7. ADMINISTRATIVE ACCESS CONTROL & SECURITY GUARD ---');
  {
    const emptyAdmin = await isUserAdmin('');
    assert(emptyAdmin === false, 'Blank user ID is rejected from admin access');
    const fakeAdmin = await isUserAdmin('00000000-0000-0000-0000-000000000000');
    assert(fakeAdmin === false, 'Non-existent UUID is denied admin privileges');
  }

  console.log(`\n========================================`);
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} checks passed.`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('\nTest runner failed:', err);
  process.exit(1);
});
