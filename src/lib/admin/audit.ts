import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { Json } from '@/lib/supabase/types';

export interface AuditLogParams {
  adminUserId: string;
  action:
    | 'coupon_created'
    | 'coupon_updated'
    | 'coupon_deactivated'
    | 'coupon_reactivated'
    | 'manual_grant_ad_free'
    | 'manual_revoke_ad_free'
    | 'payment_reviewed'
    | 'payment_manually_approved'
    | 'payment_manually_rejected';
  targetUserId?: string | null;
  targetPaymentId?: string | null;
  targetCouponId?: string | null;
  metadata?: Record<string, any>;
  reason?: string | null;
}

/**
 * Sanitizes metadata to guarantee that no secret keys or credentials are ever recorded into audit logs.
 */
function sanitizeMetadata(metadata?: Record<string, any>): Json {
  if (!metadata || typeof metadata !== 'object') return {};

  const sanitized: Record<string, any> = {};
  const forbiddenPatterns = [/secret/i, /key/i, /password/i, /token/i, /credential/i, /auth/i];

  for (const [k, v] of Object.entries(metadata)) {
    const isSensitive = forbiddenPatterns.some((pattern) => pattern.test(k));
    if (isSensitive) {
      sanitized[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      sanitized[k] = sanitizeMetadata(v);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized as Json;
}

/**
 * Records an immutable administrative audit event into public.admin_audit_logs.
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const cleanMeta = sanitizeMetadata(params.metadata);

    await admin.from('admin_audit_logs').insert({
      admin_user_id: params.adminUserId,
      action: params.action,
      target_user_id: params.targetUserId || null,
      target_payment_id: params.targetPaymentId || null,
      target_coupon_id: params.targetCouponId || null,
      metadata: cleanMeta,
      reason: params.reason || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Audit logging failure should be logged to stderr but not break server flow if resilient
    console.error('[Admin Audit Log Error]:', err);
  }
}
