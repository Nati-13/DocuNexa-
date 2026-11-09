/**
 * DocuNexa — Subscription & Plan Fulfillment Helper
 * Safely elevates user profiles upon confirmed payment, computing exact
 * expiration timestamps and preserving grandfathered Lifetime Ad-Free accounts.
 */

import { PlanId, getPlan, calculateSubscriptionExpiration } from '@/lib/planCatalog';

export async function fulfillPaymentOrder(
  adminSupabase: any,
  userId: string,
  productOrPlan: string,
  nowIso = new Date().toISOString()
): Promise<{ plan: string; expiresAt: string | null }> {
  let currentPlan = 'free';

  try {
    const { data: currentProfile } = await adminSupabase
      .from('profiles')
      .select('plan, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (currentProfile?.plan) {
      currentPlan = currentProfile.plan;
    }
  } catch {
    // ignore
  }

  const planId = (productOrPlan as PlanId) || 'ad_free';
  const planDef = getPlan(planId);
  const expiresAt = calculateSubscriptionExpiration(planId, new Date(nowIso));

  let finalPlan = planDef.id;
  let finalExpires = expiresAt;

  // Preserve permanent lifetime access for grandfathered accounts unless upgrading to Pro
  if (currentPlan === 'ad_free' && !planDef.isPro) {
    finalPlan = 'ad_free';
    finalExpires = null;
  }

  const updatePayload: Record<string, any> = {
    plan: finalPlan,
    updated_at: nowIso,
  };

  if (finalExpires !== undefined) {
    updatePayload.subscription_expires_at = finalExpires;
  }
  updatePayload.subscription_started_at = nowIso;

  try {
    await adminSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);
  } catch {
    // If migration columns not yet in DB, update plan column only
    await adminSupabase
      .from('profiles')
      .update({ plan: finalPlan, updated_at: nowIso })
      .eq('id', userId);
  }

  return { plan: finalPlan, expiresAt: finalExpires };
}

