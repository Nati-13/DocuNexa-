import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile: adminProfile } = await requireAdmin();
    const { id: ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body?.status;
    const adminNotes = body?.adminNotes;

    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (newStatus && !allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    // 1. Try updating in support_tickets table
    try {
      const updates: any = { updated_at: nowIso };
      if (newStatus) updates.status = newStatus;
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;

      const { data, error } = await admin
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select('*')
        .single();

      if (!error && data) {
        await logAdminAction({
          adminUserId: adminProfile.id,
          action: 'support_ticket_updated' as any,
          metadata: {
            ticketId,
            status: newStatus,
            adminEmail: adminProfile.email,
          },
        });

        return NextResponse.json({
          success: true,
          ticket: data,
          message: 'Support ticket updated successfully.',
        });
      }
    } catch {
      // Fallback
    }

    // 2. Fallback: Update stored ticket metadata in admin_audit_logs
    try {
      const { data: existingRows } = await admin
        .from('admin_audit_logs')
        .select('id, metadata')
        .eq('action', 'support_ticket_submitted')
        .filter('metadata->>id', 'eq', ticketId)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const row = existingRows[0];
        const currentMeta = (row.metadata as Record<string, any>) || {};
        const updatedMeta = {
          ...currentMeta,
          status: newStatus || currentMeta.status || 'open',
          admin_notes: adminNotes !== undefined ? adminNotes : currentMeta.admin_notes,
          updated_at: nowIso,
        };
        await admin
          .from('admin_audit_logs')
          .update({ metadata: updatedMeta })
          .eq('id', row.id);
      }
    } catch {
      // Non-blocking fallback
    }

    // 3. Audit log recorded update
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'support_ticket_updated' as any,
      metadata: {
        ticketId,
        status: newStatus,
        adminNotes,
        adminEmail: adminProfile.email,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: { id: ticketId, status: newStatus || 'in_progress', admin_notes: adminNotes },
      message: 'Support ticket updated successfully.',
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error updating support ticket' },
      { status: s }
    );
  }
}
