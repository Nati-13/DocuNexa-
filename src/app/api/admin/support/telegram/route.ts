import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getTelegramBotStatus,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  registerTelegramCommands,
  setTelegramChatMenuButton,
  sendTelegramMessage,
  listRecentTelegramTickets,
  retryFailedTelegramNotifications,
  DOCUNEXA_MINI_APP_URL,
} from '@/lib/telegram/bot';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const status = getTelegramBotStatus();
    const webhookInfo = await getTelegramWebhookInfo();
    const recentTickets = await listRecentTelegramTickets(30);

    const metrics = {
      totalTickets: recentTickets.length,
      delivered: recentTickets.filter((t) => t.deliveryStatus === 'delivered').length,
      failed: recentTickets.filter((t) => t.deliveryStatus === 'failed').length,
      pending: recentTickets.filter((t) => t.deliveryStatus === 'pending').length,
      lastSuccessfulDelivery:
        recentTickets.find((t) => t.deliveryStatus === 'delivered')?.deliveredAt || null,
    };

    return NextResponse.json({
      status,
      webhookInfo,
      metrics,
      recentTickets: recentTickets.slice(0, 10),
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
    const headerKey = req.headers.get('x-admin-setup-key');
    const isSetupKeyValid = Boolean(
      process.env.ADMIN_SETUP_KEY &&
      headerKey &&
      headerKey === process.env.ADMIN_SETUP_KEY
    );

    let adminUserId: string | null = null;
    let adminEmail = 'setup-key-admin';

    if (!isSetupKeyValid) {
      const { profile: adminProfile } = await requireAdmin();
      adminUserId = adminProfile.id;
      adminEmail = adminProfile.email;
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'sync_webhook';

    // 1. SYNC WEBHOOK ACTION
    if (action === 'sync_webhook') {
      const targetUrl =
        body?.url && typeof body.url === 'string' && body.url.startsWith('https://')
          ? body.url.trim()
          : 'https://docunexa.pro.et/api/telegram/webhook';

      const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
      const result = await setTelegramWebhook(targetUrl, secretToken);

      await logAdminAction({
        adminUserId: adminUserId || '17d2c680-fc22-4a1d-863d-63d46b1905b9',
        action: 'telegram_webhook_configured' as any,
        metadata: {
          targetUrl,
          adminEmail,
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
    }

    // 2. SYNC COMMANDS & MINI APP CHAT MENU BUTTON ACTION
    if (action === 'sync_commands') {
      const commandsRes = await registerTelegramCommands();
      const menuBtnRes = await setTelegramChatMenuButton(DOCUNEXA_MINI_APP_URL);

      await logAdminAction({
        adminUserId: adminUserId || '17d2c680-fc22-4a1d-863d-63d46b1905b9',
        action: 'telegram_commands_synced' as any,
        metadata: {
          adminEmail,
          commandsOk: commandsRes.ok,
          menuButtonOk: menuBtnRes.ok,
        },
        reason: `Admin synced Telegram commands and Mini App menu button`,
      });

      const allOk = commandsRes.ok && menuBtnRes.ok;
      return NextResponse.json({
        success: allOk,
        message: allOk
          ? 'Commands and Mini App button registered successfully with Telegram.'
          : `Commands: ${commandsRes.description || 'ok'}, Menu Button: ${menuBtnRes.description || 'ok'}`,
        details: {
          commands: commandsRes,
          menuButton: menuBtnRes,
        },
      });
    }

    // 3. SEND TEST NOTIFICATION TO OWNER ACTION
    if (action === 'test_notification') {
      const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
      if (!ownerChatId) {
        return NextResponse.json(
          { error: 'TELEGRAM_OWNER_CHAT_ID is not configured on the server.' },
          { status: 400 }
        );
      }

      const nowStr = new Date().toISOString();
      const testMsg = `🔔 <b>DocuNexa Owner Notification Test</b>\nThis is a real diagnostic notification initiated from the DocuNexa Administrator Console.\n\n• Triggered by: <code>${adminEmail}</code>\n• Server Time: <code>${nowStr}</code>\n• Status: <b>Operational</b>`;

      const testRes = await sendTelegramMessage(ownerChatId, testMsg, { parse_mode: 'HTML' });

      await logAdminAction({
        adminUserId: adminUserId || '17d2c680-fc22-4a1d-863d-63d46b1905b9',
        action: 'telegram_test_notification' as any,
        metadata: {
          adminEmail,
          ownerChatId,
          resultOk: testRes.ok,
          errorCode: testRes.errorCode,
          description: testRes.description,
        },
        reason: `Admin sent diagnostic test notification to owner chat ${ownerChatId}`,
      });

      if (!testRes.ok) {
        return NextResponse.json(
          {
            error:
              testRes.description ||
              'Telegram rejected test notification. Ensure the owner has started a chat with the bot.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Diagnostic message successfully accepted by Telegram (Message ID: ${testRes.messageId}).`,
      });
    }

    // 4. RETRY FAILED NOTIFICATIONS ACTION
    if (action === 'retry_failed') {
      const retryResult = await retryFailedTelegramNotifications();

      await logAdminAction({
        adminUserId: adminUserId || '17d2c680-fc22-4a1d-863d-63d46b1905b9',
        action: 'telegram_retry_failed' as any,
        metadata: {
          adminEmail,
          attempted: retryResult.attempted,
          succeeded: retryResult.succeeded,
          failed: retryResult.failed,
        },
        reason: `Admin triggered retry for ${retryResult.attempted} pending/failed notifications`,
      });

      return NextResponse.json({
        success: true,
        message: `Processed ${retryResult.attempted} notifications: ${retryResult.succeeded} delivered, ${retryResult.failed} failed.`,
        retryResult,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing Telegram admin action' },
      { status: err.statusCode || 500 }
    );
  }
}
