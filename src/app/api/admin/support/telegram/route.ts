import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getTelegramBotStatus,
  getTelegramWebhookInfo,
  setTelegramWebhook,
} from '@/lib/telegram/bot';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const status = getTelegramBotStatus();
    const webhookInfo = await getTelegramWebhookInfo();

    return NextResponse.json({
      status,
      webhookInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized or server error' },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile: adminProfile } = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const targetUrl =
      (body?.url && typeof body.url === 'string' && body.url.startsWith('https://'))
        ? body.url.trim()
        : 'https://docunexa.pro.et/api/telegram/webhook';

    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    const result = await setTelegramWebhook(targetUrl, secretToken);

    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'telegram_webhook_configured' as any,
      metadata: {
        targetUrl,
        adminEmail: adminProfile.email,
        resultOk: result.ok,
        description: result.description,
      },
      reason: `Admin registered live Telegram webhook to ${targetUrl}`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || 'Failed to register webhook with Telegram.' },
        { status: 500 }
      );
    }

    const refreshedInfo = await getTelegramWebhookInfo();

    return NextResponse.json({
      success: true,
      message: result.description || 'Telegram webhook configured successfully.',
      webhookInfo: refreshedInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error setting Telegram webhook' },
      { status: err.statusCode || 500 }
    );
  }
}
