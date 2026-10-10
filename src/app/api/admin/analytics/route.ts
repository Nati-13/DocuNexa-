import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAnalyticsSummary } from '@/lib/analytics/tracker';
import { guardApiRequest } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-analytics',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();

    const searchParams = req.nextUrl.searchParams;
    const rangeParam = searchParams.get('range') || '30d';

    let rangeDays = 30;
    if (rangeParam === '7d') rangeDays = 7;
    else if (rangeParam === '90d') rangeDays = 90;
    else if (rangeParam === 'all') rangeDays = 365;

    const summary = await getAnalyticsSummary(rangeDays);

    return NextResponse.json({
      success: true,
      range: rangeParam,
      rangeDays,
      ...summary,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching analytics' },
      { status }
    );
  }
}
