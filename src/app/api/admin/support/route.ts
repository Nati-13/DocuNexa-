import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import type { SupportStatus, SupportCategory } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-support-get',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();
    const admin = createAdminSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // 1. Try querying support_tickets table
    try {
      let query = admin
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status as SupportStatus);
      }

      if (category && category !== 'all') {
        query = query.eq('category', category as SupportCategory);
      }

      if (search) {
        query = query.or(`subject.ilike.%${search}%,email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return NextResponse.json({
          success: true,
          source: 'tickets',
          tickets: data,
        });
      }
    } catch {
      // Fallback
    }

    // 2. Fallback: Query admin_audit_logs for submitted tickets
    let auditQuery = admin
      .from('admin_audit_logs')
      .select('*')
      .eq('action', 'support_ticket_submitted')
      .order('created_at', { ascending: false });

    const { data: auditLogs, error: auditErr } = await auditQuery;

    if (auditErr) {
      return NextResponse.json({ error: auditErr.message }, { status: 500 });
    }

    const fallbackTickets = (auditLogs || []).map((log: any) => {
      const meta = log.metadata || {};
      return {
        id: meta.id || log.id,
        user_id: meta.userId || log.admin_user_id || null,
        name: meta.name || 'Anonymous',
        email: meta.email || '',
        category: meta.category || 'Other',
        subject: meta.subject || log.reason || 'Support Request',
        message: meta.message || '',
        status: meta.status || 'open',
        admin_notes: meta.admin_notes || null,
        created_at: meta.submittedAt || log.created_at,
        updated_at: log.created_at,
      };
    });

    let filtered = fallbackTickets;
    if (status && status !== 'all') {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (search) {
      const sLower = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.subject.toLowerCase().includes(sLower) ||
          t.email.toLowerCase().includes(sLower) ||
          t.name.toLowerCase().includes(sLower)
      );
    }

    return NextResponse.json({
      success: true,
      source: 'audit_logs',
      tickets: filtered,
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching support tickets' },
      { status: s }
    );
  }
}
