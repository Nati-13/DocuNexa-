import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { PaymentOrderStatus, PaymentNetwork } from '@/lib/supabase/types';
import { guardApiRequest } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

/**
 * Sanitizes a CSV cell value to strictly conform to RFC 4180
 * and protect against spreadsheet formula injection (CSV Injection / DDE).
 */
function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Formula injection defense: If string starts with =, +, -, @, \t, or \r, prefix with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180: Double quote escaping
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-payments-export',
    maxRequests: 20,
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
    const network = searchParams.get('network');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = admin
      .from('payment_orders')
      .select('*, profiles:user_id (id, email)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status as PaymentOrderStatus);
    }

    if (network && network !== 'all') {
      query = query.eq('network', network as PaymentNetwork);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    if (search) {
      query = query.or(`order_id.ilike.%${search}%,tx_id.ilike.%${search}%`);
    }

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: any[] = orders || [];

    // CSV Header row
    const headers = [
      'Order ID',
      'User ID',
      'User Email',
      'Plan / Product',
      'Payable USDT',
      'Received USDT',
      'Currency',
      'Network',
      'Status',
      'Created At',
      'Expires At',
      'Confirmed At',
      'Transaction Hash (txID)',
      'Coupon Code',
    ];

    const csvLines = [headers.map(sanitizeCsvCell).join(',')];

    for (const o of rows) {
      const line = [
        sanitizeCsvCell(o.order_id),
        sanitizeCsvCell(o.user_id),
        sanitizeCsvCell(o.profiles?.email || 'Unknown User'),
        sanitizeCsvCell(o.product || 'ad_free'),
        sanitizeCsvCell(o.payment_amount_usdt),
        sanitizeCsvCell(o.received_amount || o.payment_amount_usdt || '0.00'),
        sanitizeCsvCell(o.currency || 'USDT'),
        sanitizeCsvCell(o.network || 'Polygon'),
        sanitizeCsvCell(o.status),
        sanitizeCsvCell(o.created_at),
        sanitizeCsvCell(o.expires_at),
        sanitizeCsvCell(o.confirmed_at || 'Unconfirmed'),
        sanitizeCsvCell(o.tx_id || 'N/A'),
        sanitizeCsvCell(o.coupon_code || 'None'),
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = csvLines.join('\r\n');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `docunexa-payments-${today}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error exporting payments' },
      { status: s }
    );
  }
}
