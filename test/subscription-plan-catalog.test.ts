import {
  PLAN_CATALOG,
  PlanId,
  getPlan,
  isPaidPlan,
  isUserAdFree,
  isUserPro,
  calculateSubscriptionExpiration,
} from '../src/lib/planCatalog';
import { fulfillPaymentOrder } from '../src/lib/payments/subscriptionFulfillment';

async function runSubscriptionCatalogTests() {
  console.log('--- Testing Subscription Plans Catalog & Entitlements Engine ---');

  // Test 1: Verify all 7 plans + grandfathered plan definitions
  console.log('Test 1: Verify required plan specifications and pricing');
  const requiredPlans: Array<{
    id: PlanId;
    priceUsd: number;
    durationDays: number;
    isAdFree: boolean;
    isPro: boolean;
  }> = [
    { id: 'free', priceUsd: 0, durationDays: 0, isAdFree: false, isPro: false },
    { id: 'weekly', priceUsd: 1.0, durationDays: 7, isAdFree: true, isPro: false },
    { id: 'weekly_pro', priceUsd: 2.0, durationDays: 7, isAdFree: true, isPro: true },
    { id: 'monthly', priceUsd: 3.0, durationDays: 30, isAdFree: true, isPro: false },
    { id: 'monthly_pro', priceUsd: 6.0, durationDays: 30, isAdFree: true, isPro: true },
    { id: 'yearly', priceUsd: 27.0, durationDays: 365, isAdFree: true, isPro: false },
    { id: 'yearly_pro', priceUsd: 54.0, durationDays: 365, isAdFree: true, isPro: true },
    { id: 'ad_free', priceUsd: 2.0, durationDays: 0, isAdFree: true, isPro: false },
  ];

  for (const expected of requiredPlans) {
    const plan = getPlan(expected.id);
    if (!plan) throw new Error(`Plan "${expected.id}" missing from catalog`);
    if (plan.priceUsd !== expected.priceUsd) {
      throw new Error(`Plan "${expected.id}": Expected price $${expected.priceUsd}, got $${plan.priceUsd}`);
    }
    if (plan.durationDays !== expected.durationDays) {
      throw new Error(`Plan "${expected.id}": Expected ${expected.durationDays} days, got ${plan.durationDays}`);
    }
    if (plan.isAdFree !== expected.isAdFree) {
      throw new Error(`Plan "${expected.id}": Expected isAdFree=${expected.isAdFree}`);
    }
    if (plan.isPro !== expected.isPro) {
      throw new Error(`Plan "${expected.id}": Expected isPro=${expected.isPro}`);
    }
    console.log(`  ✓ ${plan.name} (${plan.id}): ${plan.formattedPrice} (${plan.durationDays}d, Pro=${plan.isPro})`);
  }

  // Test 2: Savings display checks
  console.log('\nTest 2: Savings display validation');
  const monthly = getPlan('monthly');
  if (!monthly.savingsDisplay?.includes('25%')) throw new Error('Monthly plan missing 25% savings display');

  const monthlyPro = getPlan('monthly_pro');
  if (!monthlyPro.savingsDisplay?.includes('25%')) throw new Error('Monthly Pro plan missing 25% savings display');

  const yearly = getPlan('yearly');
  if (!yearly.savingsDisplay?.toLowerCase().includes('monthly')) throw new Error('Yearly missing 25% off monthly display');
  console.log('✅ 25% savings displays verified on Monthly, Monthly Pro, and Yearly');

  // Test 3: Expiration timestamp calculation
  console.log('\nTest 3: Expiration timestamp computation');
  const baseDate = new Date('2026-11-01T12:00:00Z');

  const weeklyExpiry = calculateSubscriptionExpiration('weekly', baseDate);
  if (!weeklyExpiry?.startsWith('2026-11-08')) throw new Error(`Weekly expiry expected 2026-11-08, got ${weeklyExpiry}`);

  const monthlyExpiry = calculateSubscriptionExpiration('monthly', baseDate);
  if (!monthlyExpiry?.startsWith('2026-12-01')) throw new Error(`Monthly expiry expected 2026-12-01, got ${monthlyExpiry}`);

  const yearlyExpiry = calculateSubscriptionExpiration('yearly', baseDate);
  if (!yearlyExpiry?.startsWith('2027-11-01')) throw new Error(`Yearly expiry expected 2027-11-01, got ${yearlyExpiry}`);

  const lifetimeExpiry = calculateSubscriptionExpiration('ad_free', baseDate);
  if (lifetimeExpiry !== null) throw new Error(`Expected lifetime plan expiry to be null, got ${lifetimeExpiry}`);

  const freeExpiry = calculateSubscriptionExpiration('free', baseDate);
  if (freeExpiry !== null) throw new Error(`Expected free plan expiry to be null, got ${freeExpiry}`);
  console.log('✅ Subscription expiration calculations verified for all periods');

  // Test 4: Ad-free entitlement logic (Active vs Expired vs Grandfathered vs Null/Invalid Expiry)
  console.log('\nTest 4: Ad-free entitlement evaluation');
  const futureIso = new Date(Date.now() + 86400000).toISOString();
  const pastIso = new Date(Date.now() - 86400000).toISOString();

  // Grandfathered lifetime
  if (!isUserAdFree('ad_free', null)) throw new Error('Grandfathered ad_free must be ad-free with null expiry');
  if (!isUserAdFree('ad_free', pastIso)) throw new Error('Grandfathered ad_free must NEVER expire');

  // Active subscriptions with valid future timestamp
  if (!isUserAdFree('weekly', futureIso)) throw new Error('Active weekly must be ad-free');
  if (!isUserAdFree('weekly_pro', futureIso)) throw new Error('Active weekly_pro must be ad-free');
  if (!isUserAdFree('monthly', futureIso)) throw new Error('Active monthly must be ad-free');
  if (!isUserAdFree('monthly_pro', futureIso)) throw new Error('Active monthly_pro must be ad-free');
  if (!isUserAdFree('yearly', futureIso)) throw new Error('Active yearly must be ad-free');
  if (!isUserAdFree('yearly_pro', futureIso)) throw new Error('Active yearly_pro must be ad-free');

  // Time-limited plan with NULL, missing, or invalid expiry MUST FAIL CLOSED
  if (isUserAdFree('weekly', null)) throw new Error('Weekly with null expiry must NOT be ad-free');
  if (isUserAdFree('monthly', null)) throw new Error('Monthly with null expiry must NOT be ad-free');
  if (isUserAdFree('monthly', undefined)) throw new Error('Monthly with undefined expiry must NOT be ad-free');
  if (isUserAdFree('yearly', '')) throw new Error('Yearly with empty string expiry must NOT be ad-free');
  if (isUserAdFree('yearly', 'invalid-date-format')) throw new Error('Yearly with invalid date string must NOT be ad-free');

  // Expired subscriptions
  if (isUserAdFree('weekly', pastIso)) throw new Error('Expired weekly must NOT be ad-free');
  if (isUserAdFree('monthly', pastIso)) throw new Error('Expired monthly must NOT be ad-free');
  if (isUserAdFree('yearly_pro', pastIso)) throw new Error('Expired yearly_pro must NOT be ad-free');

  // Free plan
  if (isUserAdFree('free', futureIso)) throw new Error('Free plan must never be ad-free');
  if (isUserAdFree('free', null)) throw new Error('Free plan with null expiry must never be ad-free');

  // Unknown plan identifiers
  if (isUserAdFree('pro', futureIso)) throw new Error('Generic "pro" is a tier, not a valid plan ID; must fail closed');
  if (isUserAdFree('custom_plan', futureIso)) throw new Error('Unknown plan must fail closed');
  if (isUserAdFree(null, futureIso)) throw new Error('Null plan must fail closed');
  console.log('✅ Ad-free entitlement logic verified for active, expired, grandfathered, null-expiry, and invalid plans');

  // Test 5: Pro early-access entitlement logic
  console.log('\nTest 5: Pro early-access evaluation');
  if (!isUserPro('weekly_pro', futureIso)) throw new Error('Active weekly_pro must have Pro access');
  if (!isUserPro('monthly_pro', futureIso)) throw new Error('Active monthly_pro must have Pro access');
  if (!isUserPro('yearly_pro', futureIso)) throw new Error('Active yearly_pro must have Pro access');

  if (isUserPro('monthly', futureIso)) throw new Error('Standard monthly must NOT have Pro access');
  if (isUserPro('yearly', futureIso)) throw new Error('Standard yearly must NOT have Pro access');
  if (isUserPro('ad_free', null)) throw new Error('Standard lifetime ad_free must NOT have Pro access');
  if (isUserPro('monthly_pro', pastIso)) throw new Error('Expired monthly_pro must NOT have Pro access');
  console.log('✅ Pro entitlement correctly restricted to active pro tiers only');

  // Test 6: Mock fulfillment and grandfathering preservation
  console.log('\nTest 6: fulfillPaymentOrder logic and grandfathering retention');
  let mockUpdatedProfile: any = null;
  const mockAdminSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { plan: 'ad_free', subscription_expires_at: null },
          }),
        }),
      }),
      update: (payload: any) => ({
        eq: (col: string, val: any) => {
          mockUpdatedProfile = payload;
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };

  // If a grandfathered ad_free user purchases standard monthly, their lifetime plan is preserved
  const res1 = await fulfillPaymentOrder(mockAdminSupabase, 'user_123', 'monthly');
  if (res1.plan !== 'ad_free' || res1.expiresAt !== null) {
    throw new Error(`Grandfathered account lost lifetime access: ${JSON.stringify(res1)}`);
  }
  console.log('✅ Grandfathered ad_free status successfully preserved on standard re-orders');

  // If a grandfathered ad_free user purchases Pro, they elevate to Pro
  const res2 = await fulfillPaymentOrder(mockAdminSupabase, 'user_123', 'monthly_pro');
  if (res2.plan !== 'monthly_pro' || !res2.expiresAt) {
    throw new Error(`Pro upgrade failed: ${JSON.stringify(res2)}`);
  }
  console.log('✅ Pro upgrade successfully elevates plan with valid expiration');

  console.log('\n🎉 ALL SUBSCRIPTION PLANS CATALOG & ENTITLEMENT TESTS PASSED!');
}

runSubscriptionCatalogTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

