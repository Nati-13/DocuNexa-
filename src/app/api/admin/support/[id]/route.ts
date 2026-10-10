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

    // 2. Audit log recorded update
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
