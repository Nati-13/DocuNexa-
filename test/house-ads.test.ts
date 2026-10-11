import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { isRouteExcludedFromAds, EXCLUDED_AD_ROUTES } from '../src/components/ads/MonetagZone';

console.log('================================================================');
console.log('   DOCUNEXA — FIRST-PARTY PROMOTIONS & HOUSE ADS AUDIT          ');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 1. SIGNUP PROMOTION COMPONENT AUDIT
  // --------------------------------------------------------------------------
  console.log('--- 1. SIGNUP PROMOTION COMPONENT AUDIT ---');

  const signupPromoPath = path.join(process.cwd(), 'src', 'components', 'ads', 'SignupPromoBanner.tsx');
  test('SignupPromoBanner component exists on disk', () => {
    assert.ok(fs.existsSync(signupPromoPath), 'SignupPromoBanner.tsx must exist');
  });

  const signupPromoContent = fs.readFileSync(signupPromoPath, 'utf-8');

  test('SignupPromoBanner contains required heading "Get More from DocuNexa"', () => {
    assert.ok(
      signupPromoContent.includes('Get More from DocuNexa'),
      'Must contain exact heading "Get More from DocuNexa"'
    );
  });

  test('SignupPromoBanner contains required message "Create your free account and make your document workflow easier."', () => {
    assert.ok(
      signupPromoContent.includes('Create your free account and make your document workflow easier.'),
      'Must contain exact message text'
    );
  });

  test('SignupPromoBanner contains required CTA "Sign Up Free" navigating to /signup', () => {
    assert.ok(signupPromoContent.includes('Sign Up Free'), 'Must contain CTA label "Sign Up Free"');
    assert.ok(signupPromoContent.includes('href="/signup"'), 'Must navigate to /signup');
  });

  test('SignupPromoBanner suppresses display when visitor is already signed in', () => {
    assert.ok(
      signupPromoContent.includes('user !== null') || signupPromoContent.includes('if (user)'),
      'Must check user authentication state'
    );
    assert.ok(signupPromoContent.includes('return null;'), 'Must return null for authenticated users');
  });

  test('SignupPromoBanner guards against excluded/sensitive routes', () => {
    assert.ok(
      signupPromoContent.includes('isRouteExcludedFromAds'),
      'Must check isRouteExcludedFromAds'
    );
  });

  // --------------------------------------------------------------------------
  // 2. PAID AD-FREE PLAN PROMOTION COMPONENT AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 2. PAID AD-FREE PLAN PROMOTION COMPONENT AUDIT ---');

  const adFreePromoPath = path.join(process.cwd(), 'src', 'components', 'ads', 'AdFreePromoBanner.tsx');
  test('AdFreePromoBanner component exists on disk', () => {
    assert.ok(fs.existsSync(adFreePromoPath), 'AdFreePromoBanner.tsx must exist');
  });

  const adFreePromoContent = fs.readFileSync(adFreePromoPath, 'utf-8');

  test('AdFreePromoBanner contains required heading "Enjoy DocuNexa Ad-Free"', () => {
    assert.ok(
      adFreePromoContent.includes('Enjoy DocuNexa Ad-Free'),
      'Must contain exact heading "Enjoy DocuNexa Ad-Free"'
    );
  });

  test('AdFreePromoBanner contains required message "Upgrade to the Ad-Free plan for a cleaner document workspace without advertising."', () => {
    assert.ok(
      adFreePromoContent.includes(
        'Upgrade to the Ad-Free plan for a cleaner document workspace without advertising.'
      ),
      'Must contain exact message text'
    );
  });

  test('AdFreePromoBanner contains required CTA "Explore Ad-Free Plan" navigating to /choose-plan', () => {
    assert.ok(
      adFreePromoContent.includes('Explore Ad-Free Plan'),
      'Must contain CTA label "Explore Ad-Free Plan"'
    );
    assert.ok(adFreePromoContent.includes('href="/choose-plan"'), 'Must navigate to /choose-plan');
  });

  test('AdFreePromoBanner strictly suppresses display for users on the ad_free plan', () => {
    assert.ok(
      adFreePromoContent.includes("user?.plan === 'ad_free'"),
      'Must check if user.plan is ad_free'
    );
    assert.ok(adFreePromoContent.includes('return null;'), 'Must return null for ad_free users');
  });

  test('AdFreePromoBanner displays authentic $2 one-time pricing without fictitious claims', () => {
    assert.ok(
      adFreePromoContent.includes('$2 One-Time') || adFreePromoContent.includes('$2 one-time'),
      'Must reflect authentic $2 one-time plan pricing'
    );
    assert.ok(
      !adFreePromoContent.includes('$9.99') && !adFreePromoContent.includes('$19.99'),
      'Must not fabricate fictional prices'
    );
  });

  // --------------------------------------------------------------------------
  // 3. ADSLOT HOUSE PROMOTION INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. ADSLOT HOUSE PROMOTION INTEGRATION ---');

  const adSlotPath = path.join(process.cwd(), 'src', 'components', 'ads', 'AdSlot.tsx');
  const adSlotContent = fs.readFileSync(adSlotPath, 'utf-8');

  test('AdSlot imports and renders SignupPromoBanner and AdFreePromoBanner', () => {
    assert.ok(adSlotContent.includes('SignupPromoBanner'), 'Must import SignupPromoBanner');
    assert.ok(adSlotContent.includes('AdFreePromoBanner'), 'Must import AdFreePromoBanner');
  });

  test('AdSlot suppresses display for active Ad-Free subscribers', () => {
    assert.ok(adSlotContent.includes("user?.plan === 'ad_free'"), 'Must check user plan');
    assert.ok(adSlotContent.includes('return null;'), 'Must return null for ad-free subscribers');
  });

  test('AdSlot suppresses display on excluded sensitive routes', () => {
    assert.ok(adSlotContent.includes('isRouteExcludedFromAds'), 'Must check isRouteExcludedFromAds');
  });

  test('AdSlot contains zero artificial ad click triggers', () => {
    assert.ok(
      !adSlotContent.includes('simulateClick') && !adSlotContent.includes('triggerAdClick'),
      'Must not contain artificial click simulation'
    );
  });

  // --------------------------------------------------------------------------
  // 4. ROUTE EXCLUSION & SENSITIVE FLOW AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. ROUTE EXCLUSIONS & SENSITIVE FLOW AUDIT ---');

  test('Sensitive routes are strictly excluded from promotional banners', () => {
    const sensitiveRoutes = [
      '/admin',
      '/admin/payments',
      '/admin/settings',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/account',
      '/choose-plan',
    ];

    sensitiveRoutes.forEach((route) => {
      assert.strictEqual(
        isRouteExcludedFromAds(route),
        true,
        `Route ${route} must be excluded from promotions`
      );
    });

    // Public routes are permitted
    assert.strictEqual(isRouteExcludedFromAds('/'), false, 'Homepage must be allowed');
    assert.strictEqual(isRouteExcludedFromAds('/tools'), false, 'Tools index must be allowed');
    assert.strictEqual(
      isRouteExcludedFromAds('/tools/pdf-unit-cutter'),
      false,
      'Tool pages must be allowed'
    );
  });

  // --------------------------------------------------------------------------
  // 5. COPY CONSISTENCY & TRUST AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 5. COPY CONSISTENCY & TRUST AUDIT ---');

  const homepagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
  const homepageContent = fs.readFileSync(homepagePath, 'utf-8');

  test('Homepage copy removed contradictory "no paid plans, no premium tier" statement', () => {
    assert.strictEqual(
      homepageContent.includes('No paid plans, no premium tier'),
      false,
      'Contradictory "no paid plans, no premium tier" statement must be removed from homepage'
    );
    assert.ok(
      homepageContent.includes('All core PDF tools are free with zero paywalls'),
      'Must state that core PDF tools are free with zero paywalls'
    );
    assert.ok(
      homepageContent.includes('optional one-time Ad-Free upgrade'),
      'Must state that the Ad-Free upgrade is an optional one-time upgrade'
    );
  });

  const aboutPath = path.join(process.cwd(), 'src', 'app', 'about', 'page.tsx');
  const aboutContent = fs.readFileSync(aboutPath, 'utf-8');

  test('About page copy removed contradictory "There are no paid plans" statement', () => {
    assert.strictEqual(
      aboutContent.includes('There are no paid plans, subscriptions, paywalls'),
      false,
      'Contradictory "There are no paid plans" statement must be removed from /about'
    );
    assert.ok(
      aboutContent.includes('all 34 core PDF tools remain completely free'),
      'Must state that all 34 core tools remain free'
    );
    assert.ok(
      aboutContent.includes('optional one-time Ad-Free upgrade'),
      'Must state that the Ad-Free upgrade is optional'
    );
  });

  // --------------------------------------------------------------------------
  // 6. PRESERVE MONETAG & AD-FREE ENTITLEMENTS
  // --------------------------------------------------------------------------
  console.log('\n--- 6. PRESERVE MONETAG & AD-FREE ENTITLEMENTS ---');

  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

  test('RootLayout preserves Monetag script and zone 289364', () => {
    assert.ok(layoutContent.includes('https://quge5.com/88/tag.min.js'), 'Must preserve Monetag script');
    assert.ok(layoutContent.includes('data-zone="289364"'), 'Must preserve zone 289364');
    assert.ok(layoutContent.includes('isAdFree'), 'Must gate on isAdFree');
    assert.ok(layoutContent.includes('MonetagServiceWorkerCleanup'), 'Must preserve SW cleanup for ad_free');
  });

  const monetagZonePath = path.join(process.cwd(), 'src', 'components', 'ads', 'MonetagZone.tsx');
  const monetagZoneContent = fs.readFileSync(monetagZonePath, 'utf-8');

  test('MonetagZone preserves script and zone 12002632', () => {
    assert.ok(
      monetagZoneContent.includes('https://al5sm.com/tag.min.js'),
      'Must preserve zone 12002632 script'
    );
    assert.ok(monetagZoneContent.includes('data-zone="12002632"'), 'Must preserve zone 12002632');
  });

  test('MonetagMainZone enforces identical route gating for zone 289364', () => {
    assert.ok(monetagZoneContent.includes('export function MonetagMainZone'), 'MonetagMainZone must be exported');
    assert.ok(monetagZoneContent.includes('isRouteExcludedFromAds(pathname)'), 'MonetagMainZone must check route exclusions');
    assert.ok(monetagZoneContent.includes('isAdFree || user?.plan === \'ad_free\''), 'MonetagMainZone must check ad-free plan');
  });

  test('MonetagController cleanup unregisters SW and removes injected ads on excluded routes', () => {
    const controllerPath = path.join(process.cwd(), 'src', 'components', 'ads', 'MonetagController.tsx');
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
    assert.ok(controllerContent.includes('isRouteExcludedFromAds'), 'Cleanup must check route exclusions');
    assert.ok(controllerContent.includes('unregister'), 'Cleanup must call unregister()');
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`HOUSE ADS & PROMOTIONS SUMMARY: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
