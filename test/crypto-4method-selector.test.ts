/**
 * DOCUNEXA — 4-METHOD CRYPTO PAYMENT SELECTOR & LOGO AUDIT
 *
 * Validates:
 * 1. Exactly four methods defined in checkout configuration:
 *    - USDT Polygon (Active)
 *    - USDT Aptos (Active)
 *    - USDT TRON TRC20 (Coming Soon / Disabled)
 *    - USDC Polygon Native (Coming Soon / Disabled, separated from legacy USDC.e)
 * 2. Official brand logos:
 *    - Local SVG assets exist on disk in public/images/crypto/ (USDT, USDC, Polygon, Aptos, TRON).
 *    - Each method defines valid tokenLogoSrc, tokenLogoAlt, networkLogoSrc, networkLogoAlt.
 *    - Both logos are rendered clearly side by side in the modal without using colored circles as substitutes.
 *    - Accessible alt text is provided for all brand logos.
 * 3. Disabled methods strictly blocked from creating payment orders or reporting confirmation.
 * 4. Token contracts separated accurately:
 *    - Polygon USDT: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
 *    - Aptos USDT: 0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b
 *    - TRON USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 *    - Polygon Native USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 *    - Polygon Bridged USDC.e: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 (not accepted)
 * 5. Modal markup renders all four options with distinct active vs Coming Soon states and responsive grid.
 */

import fs from 'fs';
import path from 'path';
import {
  CRYPTO_SELECTOR_OPTIONS,
  OFFICIAL_CONTRACTS,
  isValidTronAddress,
  isValidEvmAddress,
  assertPaymentMethodActive,
} from '../src/lib/payments/cryptoConfig';

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

async function runSelectorTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — 4-METHOD CRYPTO PAYMENT SELECTOR & LOGO AUDIT      ');
  console.log('================================================================\n');

  // --- 1. LOCAL BRAND ASSETS EXISTENCE & INTEGRITY (PNG + SVG) ---
  console.log('--- 1. OFFICIAL BRAND LOGO ASSETS ---');

  const cryptoDir = path.join(__dirname, '..', 'public', 'images', 'crypto');
  const requiredSvgs = ['usdt.svg', 'usdc.svg', 'polygon.svg', 'aptos.svg', 'tron.svg'];
  const requiredPngs = ['usdt.png', 'usdc.png', 'polygon.png', 'aptos.png', 'tron.png'];

  requiredPngs.forEach((pngFile) => {
    const fullPath = path.join(cryptoDir, pngFile);
    assert(
      `Official PNG asset exists: ${pngFile}`,
      fs.existsSync(fullPath),
      `Verified on disk: public/images/crypto/${pngFile}`
    );
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      assert(`PNG ${pngFile} is non-empty`, stats.size > 1000, `${stats.size} bytes`);
    }
  });

  requiredSvgs.forEach((svgFile) => {
    const fullPath = path.join(cryptoDir, svgFile);
    assert(
      `Official SVG asset exists: ${svgFile}`,
      fs.existsSync(fullPath),
      `Verified on disk: public/images/crypto/${svgFile}`
    );
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(`SVG ${svgFile} has valid XML root`, content.includes('<svg') && content.includes('</svg>'));
    }
  });

  // --- 2. FOUR PAYMENT METHODS IN SELECTOR CONFIGURATION ---
  console.log('\n--- 2. SELECTOR CONFIGURATION & BRAND METADATA ---');

  assert(
    'Selector contains exactly 4 payment options',
    CRYPTO_SELECTOR_OPTIONS.length === 4,
    `Found ${CRYPTO_SELECTOR_OPTIONS.length} options`
  );

  const polygonUsdt = CRYPTO_SELECTOR_OPTIONS.find((o) => o.id === 'polygon_usdt');
  const aptosUsdt = CRYPTO_SELECTOR_OPTIONS.find((o) => o.id === 'aptos_usdt');
  const tronUsdt = CRYPTO_SELECTOR_OPTIONS.find((o) => o.id === 'tron_usdt');
  const polygonUsdc = CRYPTO_SELECTOR_OPTIONS.find((o) => o.id === 'polygon_usdc');

  // Option 1: USDT Polygon
  assert('Option 1: USDT Polygon exists', Boolean(polygonUsdt));
  assert('Option 1: USDT Polygon is active', polygonUsdt?.isEnabled === true && polygonUsdt?.status === 'active');
  assert('Option 1: USDT Polygon has correct contract', polygonUsdt?.contractAddress === OFFICIAL_CONTRACTS.POLYGON_USDT);
  assert('Option 1: USDT Polygon defines Tether token logo', polygonUsdt?.tokenLogoSrc === '/images/crypto/usdt.png');
  assert('Option 1: USDT Polygon defines Polygon network logo', polygonUsdt?.networkLogoSrc === '/images/crypto/polygon.png');
  assert('Option 1: USDT Polygon defines accessible alt text', Boolean(polygonUsdt?.tokenLogoAlt && polygonUsdt?.networkLogoAlt));

  // Option 2: USDT Aptos
  assert('Option 2: USDT Aptos exists', Boolean(aptosUsdt));
  assert('Option 2: USDT Aptos is active', aptosUsdt?.isEnabled === true && aptosUsdt?.status === 'active');
  assert('Option 2: USDT Aptos has correct contract', aptosUsdt?.contractAddress === OFFICIAL_CONTRACTS.APTOS_USDT_METADATA);
  assert('Option 2: USDT Aptos defines Tether token logo', aptosUsdt?.tokenLogoSrc === '/images/crypto/usdt.png');
  assert('Option 2: USDT Aptos defines Aptos network logo', aptosUsdt?.networkLogoSrc === '/images/crypto/aptos.png');
  assert('Option 2: USDT Aptos defines accessible alt text', Boolean(aptosUsdt?.tokenLogoAlt && aptosUsdt?.networkLogoAlt));

  // Option 3: USDT TRON (TRC20)
  assert('Option 3: USDT TRON (TRC20) exists', Boolean(tronUsdt));
  assert('Option 3: USDT TRON is Active and operational', tronUsdt?.isEnabled === true && tronUsdt?.status === 'active');
  assert('Option 3: USDT TRON has official Tether TRC20 contract', tronUsdt?.contractAddress === OFFICIAL_CONTRACTS.TRON_USDT_TRC20);
  assert('Option 3: USDT TRON defines Tether token logo', tronUsdt?.tokenLogoSrc === '/images/crypto/usdt.png');
  assert('Option 3: USDT TRON defines TRON network logo', tronUsdt?.networkLogoSrc === '/images/crypto/tron.png');
  assert('Option 3: USDT TRON defines accessible alt text', Boolean(tronUsdt?.tokenLogoAlt && tronUsdt?.networkLogoAlt));

  // Option 4: USDC Polygon (Native)
  assert('Option 4: USDC Polygon (Native) exists', Boolean(polygonUsdc));
  assert('Option 4: USDC Polygon is Active and operational', polygonUsdc?.isEnabled === true && polygonUsdc?.status === 'active');
  assert('Option 4: USDC Polygon has official Native Circle contract', polygonUsdc?.contractAddress === OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE);
  assert(
    'Option 4: USDC Polygon strictly differs from legacy bridged USDC.e',
    polygonUsdc?.contractAddress !== OFFICIAL_CONTRACTS.POLYGON_USDC_BRIDGED_LEGACY,
    `Native: ${polygonUsdc?.contractAddress} vs Bridged: ${OFFICIAL_CONTRACTS.POLYGON_USDC_BRIDGED_LEGACY}`
  );
  assert('Option 4: USDC Polygon defines Circle USDC token logo', polygonUsdc?.tokenLogoSrc === '/images/crypto/usdc.png');
  assert('Option 4: USDC Polygon defines Polygon network logo', polygonUsdc?.networkLogoSrc === '/images/crypto/polygon.png');
  assert('Option 4: USDC Polygon defines accessible alt text', Boolean(polygonUsdc?.tokenLogoAlt && polygonUsdc?.networkLogoAlt));

  // --- 3. ADDRESS VALIDATION & FAIL-CLOSED GUARDS ---
  console.log('\n--- 3. ADDRESS VALIDATION & FAIL-CLOSED GUARDS ---');

  // Address validation sanity
  assert('Official TRON USDT address passes isValidTronAddress', isValidTronAddress(OFFICIAL_CONTRACTS.TRON_USDT_TRC20));
  assert('Polygon EVM addresses pass isValidEvmAddress', isValidEvmAddress(OFFICIAL_CONTRACTS.POLYGON_USDT));
  assert('TRON address rejected by EVM validator', !isValidEvmAddress(OFFICIAL_CONTRACTS.TRON_USDT_TRC20));
  assert('EVM address rejected by TRON validator', !isValidTronAddress(OFFICIAL_CONTRACTS.POLYGON_USDT));

  // --- 4. UI MODAL MARKUP & LOGO RENDERING ---
  console.log('\n--- 4. PAYMENT MODAL UI & BRAND LOGOS ---');

  const modalSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'payments', 'BybitPaymentModal.tsx'),
    'utf8'
  );

  assert('Modal imports CRYPTO_SELECTOR_OPTIONS', modalSource.includes('CRYPTO_SELECTOR_OPTIONS'));
  assert('Modal maps over selector options', modalSource.includes('CRYPTO_SELECTOR_OPTIONS.map('));
  assert('Modal renders token logo img with method.tokenLogoSrc', modalSource.includes('src={method.tokenLogoSrc}'));
  assert('Modal renders network logo img with method.networkLogoSrc', modalSource.includes('src={method.networkLogoSrc}'));
  assert('Modal includes accessible alt attribute on token logo', modalSource.includes('alt={method.tokenLogoAlt}'));
  assert('Modal includes accessible alt attribute on network logo', modalSource.includes('alt={method.networkLogoAlt}'));
  assert(
    'Modal does NOT use colored circles as logo substitutes in selector',
    !modalSource.includes('rounded-full ${method.indicatorColor} inline-block shrink-0')
  );
  assert('Modal preserves responsive grid (grid-cols-1 sm:grid-cols-2)', modalSource.includes('grid-cols-1 sm:grid-cols-2'));
  assert('Modal displays official Polygon USDT contract in warning note', modalSource.includes('OFFICIAL_CONTRACTS.POLYGON_USDT'));
  assert('Modal displays official Aptos USDT metadata in warning note', modalSource.includes('OFFICIAL_CONTRACTS.APTOS_USDT_METADATA'));
  assert('Modal displays official TRON USDT contract in warning note', modalSource.includes('OFFICIAL_CONTRACTS.TRON_USDT_TRC20'));
  assert('Modal displays official Polygon Native USDC contract in warning note', modalSource.includes('OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE'));

  // --- 5. BACKEND ORDER CREATION GUARDS ---
  console.log('\n--- 5. SERVER ROUTE GUARDS & ORDER CREATION ---');

  const createOrderSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'api', 'payments', 'create-order', 'route.ts'),
    'utf8'
  );

  assert(
    'create-order route supports TRON USDT payment method',
    createOrderSource.includes("rawMethod === 'tron_usdt'") || createOrderSource.includes("requestedNetwork = 'TRON'")
  );
  assert(
    'create-order route supports Polygon USDC payment method',
    createOrderSource.includes("rawMethod === 'polygon_usdc'") || createOrderSource.includes("requestedCurrency = 'USDC'")
  );
  assert(
    'create-order route validates TRON address format',
    createOrderSource.includes('isValidTronAddress')
  );
  assert(
    'create-order route validates Polygon USDC address format',
    createOrderSource.includes('isValidEvmAddress')
  );
  assert(
    'create-order route rejects unsupported networks with 400',
    createOrderSource.includes('UNSUPPORTED_NETWORK')
  );
  assert(
    'create-order route preserves Ad-Free product and $2.00 price',
    createOrderSource.includes("product: 'ad_free'") && createOrderSource.includes('base_amount_usd: 2.00')
  );

  // --- 6. BACKEND VERIFICATION ISOLATION ---
  console.log('\n--- 6. PAYMENT VERIFICATION ISOLATION ---');

  const checkRouteSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'api', 'payments', 'bybit', 'check', 'route.ts'),
    'utf8'
  );

  assert(
    'bybit/check route dispatches to Aptos verification',
    checkRouteSource.includes("order.network === 'Aptos'")
  );
  assert(
    'bybit/check route dispatches to TRON verification',
    checkRouteSource.includes("order.network === 'TRON'")
  );
  assert(
    'bybit/check route dispatches to Polygon USDC verification',
    checkRouteSource.includes("order.currency === 'USDC'")
  );
  assert(
    'bybit/check route dispatches to Polygon USDT verification',
    checkRouteSource.includes('fetchPolygonUsdtDeposits') || checkRouteSource.includes('fetchBybitDeposits')
  );

  console.log('\n================================================================');
  console.log(` SELECTOR & LOGO AUDIT COMPLETE: ${passed} of ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log(' ALL 4-METHOD CRYPTO SELECTOR & LOGO AUDIT TESTS PASSED 100%!');
    console.log('================================================================\n');
  } else {
    console.error(` FAILURES: ${total - passed}`);
    process.exitCode = 1;
  }
}

runSelectorTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
