/**
 * DocuNexa — Subscription Plans Catalog & Entitlements Engine
 *
 * Defines the authoritative subscription plans catalog, pricing, durations,
 * and server/client entitlement evaluators.
 *
 * REQUIRED PLANS:
 *  - Free ($0, ad-supported)
 *  - Weekly ($1/wk, ad-free)
 *  - Weekly Pro ($2/wk, ad-free, early access)
 *  - Monthly ($3/mo, ad-free, 25% savings display)
 *  - Monthly Pro ($6/mo, ad-free, early access, 25% savings display)
 *  - Yearly ($27/yr proposed default, ad-free, 25% off monthly)
 *  - Yearly Pro ($54/yr proposed default, ad-free, early access, 25% off monthly)
 *
 * GRANDFATHERED:
 *  - Ad-Free Lifetime ('ad_free'): permanent lifetime ad-free access for past purchasers.
 */

export type PlanId =
  | 'free'
  | 'weekly'
  | 'weekly_pro'
  | 'monthly'
  | 'monthly_pro'
  | 'yearly'
  | 'yearly_pro'
  | 'ad_free';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  tier: 'free' | 'standard' | 'pro' | 'lifetime';
  billingInterval: 'week' | 'month' | 'year' | 'lifetime' | 'free';
  durationDays: number;
  priceUsd: number;
  formattedPrice: string;
  periodLabel: string;
  savingsDisplay?: string;
  isProvisional?: boolean;
  isPro: boolean;
  isAdFree: boolean;
  features: string[];
  ctaLabel: string;
  popular?: boolean;
}

// Authoritative plan configurations
export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tier: 'free',
    billingInterval: 'free',
    durationDays: 0,
    priceUsd: 0,
    formattedPrice: '$0',
    periodLabel: 'Free forever',
    isPro: false,
    isAdFree: false,
    features: [
      'Full access to all PDF tools',
      'Automatic unit and chapter detection',
      'Supported by non-intrusive advertising',
      'Standard processing queue',
    ],
    ctaLabel: 'Continue Free',
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly',
    tier: 'standard',
    billingInterval: 'week',
    durationDays: 7,
    priceUsd: 1.0,
    formattedPrice: '$1',
    periodLabel: 'per week',
    isPro: false,
    isAdFree: true,
    features: [
      '100% ad-free experience across all tools',
      'Full access to all PDF tools',
      'Instant client-side unit splitting',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '7 days active entitlement',
    ],
    ctaLabel: 'Choose Weekly',
  },
  weekly_pro: {
    id: 'weekly_pro',
    name: 'Weekly Pro',
    badge: 'Early Access',
    tier: 'pro',
    billingInterval: 'week',
    durationDays: 7,
    priceUsd: 2.0,
    formattedPrice: '$2',
    periodLabel: 'per week',
    isPro: true,
    isAdFree: true,
    features: [
      '100% ad-free experience across all tools',
      'Early access to new tools and beta features',
      'Full access to all PDF tools',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '7 days active entitlement',
    ],
    ctaLabel: 'Choose Weekly Pro',
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    badge: 'Popular',
    tier: 'standard',
    billingInterval: 'month',
    durationDays: 30,
    priceUsd: 3.0,
    formattedPrice: '$3',
    periodLabel: 'per month',
    savingsDisplay: 'Save 25%',
    isPro: false,
    isAdFree: true,
    popular: true,
    features: [
      '100% ad-free experience across all tools',
      'Full access to all PDF tools',
      '25% savings compared to weekly rate',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '30 days active entitlement',
    ],
    ctaLabel: 'Choose Monthly',
  },
  monthly_pro: {
    id: 'monthly_pro',
    name: 'Monthly Pro',
    badge: 'Pro Savings',
    tier: 'pro',
    billingInterval: 'month',
    durationDays: 30,
    priceUsd: 6.0,
    formattedPrice: '$6',
    periodLabel: 'per month',
    savingsDisplay: 'Save 25%',
    isPro: true,
    isAdFree: true,
    features: [
      '100% ad-free experience across all tools',
      'Early access to new tools and beta features',
      'Full access to all PDF tools',
      '25% savings compared to weekly rate',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '30 days active entitlement',
    ],
    ctaLabel: 'Choose Monthly Pro',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    tier: 'standard',
    billingInterval: 'year',
    durationDays: 365,
    priceUsd: 27.0, // Provisional price: $27/year (awaiting final authorization)
    formattedPrice: '$27',
    periodLabel: 'per year (provisional)',
    savingsDisplay: '25% Off Monthly (Provisional)',
    isProvisional: true,
    isPro: false,
    isAdFree: true,
    features: [
      '100% ad-free experience across all tools',
      'Full access to all PDF tools',
      'Provisional price (awaiting final authorization)',
      'Equivalent to 25% off 12 monthly payments',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '365 days full access',
    ],
    ctaLabel: 'Choose Yearly (Provisional)',
  },
  yearly_pro: {
    id: 'yearly_pro',
    name: 'Yearly Pro',
    badge: 'Provisional',
    tier: 'pro',
    billingInterval: 'year',
    durationDays: 365,
    priceUsd: 54.0, // Provisional price: $54/year (awaiting final authorization)
    formattedPrice: '$54',
    periodLabel: 'per year (provisional)',
    savingsDisplay: '25% Off Monthly (Provisional)',
    isProvisional: true,
    isPro: true,
    isAdFree: true,
    popular: false,
    features: [
      '100% ad-free experience across all tools',
      'Early access to new tools and beta features',
      'Full access to all PDF tools',
      'Provisional price (awaiting final authorization)',
      'Equivalent to 25% off 12 monthly payments',
      'Manual renewal via USDT, USDC, or Bybit UID',
      '365 days full access',
    ],
    ctaLabel: 'Choose Yearly Pro (Provisional)',
  },
  ad_free: {
    id: 'ad_free',
    name: 'Lifetime Ad-Free',
    badge: 'Grandfathered',
    tier: 'lifetime',
    billingInterval: 'lifetime',
    durationDays: 0,
    priceUsd: 2.0,
    formattedPrice: 'Lifetime',
    periodLabel: 'Permanent access',
    isPro: false,
    isAdFree: true,
    features: [
      'Grandfathered one-time purchase entitlement',
      '100% ad-free experience across all tools',
      'Never expires',
    ],
    ctaLabel: 'Lifetime Entitlement Active',
  },
};

/**
 * Returns a plan definition by ID, defaulting to 'free' if invalid or missing
 */
export function getPlan(planId: string | null | undefined): PlanDefinition {
  if (!planId) return PLAN_CATALOG.free;
  const key = planId.toLowerCase() as PlanId;
  return PLAN_CATALOG[key] || PLAN_CATALOG.free;
}

/**
 * Checks whether a given plan identifier represents a recognized paid plan
 */
export function isPaidPlan(planId: string | null | undefined): boolean {
  if (!planId) return false;
  const key = planId.toLowerCase() as PlanId;
  return key in PLAN_CATALOG && key !== 'free';
}

/**
 * Evaluates whether a user has active ad-free entitlement.
 * Handles grandfathered lifetime purchases ('ad_free'), active subscriptions,
 * and expired subscriptions.
 */
export function isUserAdFree(
  plan: string | null | undefined,
  expiresAt?: string | null
): boolean {
  if (!plan) return false;
  const cleanPlan = plan.toLowerCase() as PlanId;

  // Free tier never grants ad-free entitlement
  if (cleanPlan === 'free') {
    return false;
  }

  // Grandfathered lifetime purchases never expire
  if (cleanPlan === 'ad_free') {
    return true;
  }

  // Active time-limited subscription plans require a valid future expiration timestamp
  if (
    cleanPlan === 'weekly' ||
    cleanPlan === 'weekly_pro' ||
    cleanPlan === 'monthly' ||
    cleanPlan === 'monthly_pro' ||
    cleanPlan === 'yearly' ||
    cleanPlan === 'yearly_pro'
  ) {
    if (!expiresAt) {
      // Missing or NULL expiration timestamp fails closed
      return false;
    }
    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime)) {
      // Invalid timestamp fails closed
      return false;
    }
    return expiryTime > Date.now();
  }

  // Unknown plan identifiers fail closed
  return false;
}

/**
 * Evaluates whether a user has active Pro entitlement (early access to future tools).
 */
export function isUserPro(
  plan: string | null | undefined,
  expiresAt?: string | null
): boolean {
  if (!plan) return false;
  const cleanPlan = plan.toLowerCase() as PlanId;

  if (
    cleanPlan === 'weekly_pro' ||
    cleanPlan === 'monthly_pro' ||
    cleanPlan === 'yearly_pro'
  ) {
    if (!expiresAt) {
      // Missing or NULL expiration timestamp fails closed
      return false;
    }
    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime)) {
      // Invalid timestamp fails closed
      return false;
    }
    return expiryTime > Date.now();
  }

  return false;
}

/**
 * Computes the future expiration ISO timestamp for a plan starting from a given date.
 * Returns null for lifetime or free plans.
 */
export function calculateSubscriptionExpiration(
  planId: PlanId,
  startDate = new Date()
): string | null {
  const plan = getPlan(planId);
  if (plan.durationDays <= 0) return null;

  const expiry = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

