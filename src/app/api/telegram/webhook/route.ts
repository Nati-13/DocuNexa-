import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramBotStatus,
  getTelegramWebhookInfo,
  handleTelegramWebhookUpdate,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
} from '@/lib/telegram/bot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getTelegramBotStatus();
  let liveWebhook = null;

  if (status.configured) {
    liveWebhook = await getTelegramWebhookInfo();
  }

  return NextResponse.json({
    status: status.configured ? 'ready' : 'awaiting_token',
    handle: TELEGRAM_BOT_HANDLE,
    url: TELEGRAM_BOT_URL,
    configured: status.configured,
    ownerConfigured: status.ownerConfigured,
    webhookSecretConfigured: status.webhookSecretConfigured,
    liveWebhook: liveWebhook ? {
      hasTelegramWebhook: liveWebhook.configured,
      pendingUpdates: liveWebhook.info?.pendingUpdateCount || 0,
      lastError: liveWebhook.info?.lastErrorMessage || null,
      errorDate: liveWebhook.info?.lastErrorDate || null,
    } : null,
    message: status.message,
  });
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error: 'Telegram bot processing is dormant. TELEGRAM_BOT_TOKEN is not configured on the server.',
        handle: TELEGRAM_BOT_HANDLE,
        url: TELEGRAM_BOT_URL,
      },
      { status: 503 }
    );
  }

  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');

  try {
    const update = await req.json().catch(() => ({}));
    const result = await handleTelegramWebhookUpdate(update, secretToken);

    if (!result.ok) {
      if (result.handled === 'rejected') {
        return NextResponse.json(
          { error: result.error || 'Forbidden: invalid secret token' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: result.error || 'Error processing Telegram update' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, handled: result.handled });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error processing webhook update' },
      { status: 500 }
    );
  }
}
