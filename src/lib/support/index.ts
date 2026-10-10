import { createAdminSupabaseClient } from '@/lib/supabase/server';
import {
  SUPPORT_CATEGORIES,
  SupportTicketInput,
  SupportValidationResult,
  validateSupportTicketInput,
  isValidEmail,
} from './constants';

export {
  SUPPORT_CATEGORIES,
  validateSupportTicketInput,
  isValidEmail,
};
export type {
  SupportTicketInput,
  SupportValidationResult,
};

/**
 * Persists a support request into Supabase.
 * Primary: public.support_tickets table.
 * Resilient Fallback: public.admin_audit_logs table if the migrations are yet to be applied.
 */
export async function persistSupportTicket(
  ticket: SupportTicketInput
): Promise<{ success: boolean; ticketId?: string; error?: string; source?: 'tickets' | 'audit_logs' }> {
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  // Try saving into support_tickets table first
  try {
    const { data, error } = await admin
      .from('support_tickets')
      .insert({
        user_id: ticket.userId || null,
        name: ticket.name,
        email: ticket.email,
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        status: 'open',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      return {
        success: true,
        ticketId: data.id,
        source: 'tickets',
      };
    }
  } catch {
    // Fall back to admin_audit_logs if table not yet present
  }

  // Fallback: Persist into admin_audit_logs table
  try {
    const fallbackId = `TICKET-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { error: auditError } = await admin
      .from('admin_audit_logs')
      .insert({
        admin_user_id: null,
        action: 'support_ticket_submitted',
        metadata: {
          id: fallbackId,
          name: ticket.name,
          email: ticket.email,
          category: ticket.category,
          subject: ticket.subject,
          message: ticket.message,
          userId: ticket.userId || null,
          status: 'open',
          submittedAt: nowIso,
        },
        reason: `Support request [${ticket.category}]: ${ticket.subject} from ${ticket.email}`,
      });

    if (!auditError) {
      return {
        success: true,
        ticketId: fallbackId,
        source: 'audit_logs',
      };
    }

    return {
      success: false,
      error: auditError.message || 'Failed to persist support ticket in database.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Database error persisting support ticket.',
    };
  }
}
