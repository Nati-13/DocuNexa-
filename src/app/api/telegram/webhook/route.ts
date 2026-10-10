import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramBotStatus,
  getTelegramReplyForText,
  sendTelegramMessage,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
} from '@/lib/telegram/bot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getTelegramBotStatus();
  return NextResponse.json({
    status: status.configured ? 'ready' : 'awaiting_token',
    handle: TELEGRAM_BOT_HANDLE,
    url: TELEGRAM_BOT_URL,
    configured: status.configured,
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

  try {
    const update = await req.json().catch(() => ({}));
    const message = update?.message;

    if (message && message.chat && message.text) {
      const chatId = message.chat.id;
      const text = message.text;
      const reply = getTelegramReplyForText(text);

      await sendTelegramMessage(chatId, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing webhook update' },
      { status: 500 }
    );
  }
}
