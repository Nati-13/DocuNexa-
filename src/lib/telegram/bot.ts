/**
 * DocuNexa — Telegram Support Bot Engine
 * Customer <-> Owner <-> Customer Bidirectional Support Routing
 *
 * Server-side Environment Variables:
 * - TELEGRAM_BOT_TOKEN: Bot token provided by @BotFather
 * - TELEGRAM_OWNER_CHAT_ID: Verified chat ID of the site owner/operator
 * - TELEGRAM_WEBHOOK_SECRET: Secret token for X-Telegram-Bot-Api-Secret-Token header verification
 */

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
  TELEGRAM_FAQ_TOPICS,
  getTelegramReplyForText,
  type TelegramBotStatus,
} from './constants';

export {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
  TELEGRAM_FAQ_TOPICS,
  getTelegramReplyForText,
};
export type { TelegramBotStatus };

export interface TelegramMappingData {
  customer_chat_id: string | number;
  customer_message_id?: number;
  customer_name?: string;
  customer_user_id?: string | number;
  ticket_ref: string;
}

// In-memory LRU/map cache for fast lookup across identical serverless executions
const localMappingCache = new Map<string, TelegramMappingData>();
const processedUpdatesCache = new Set<string>();

/**
 * Escapes characters for Telegram Markdown (V1)
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Returns current configuration status of the Telegram bot without exposing secrets.
 */
export function getTelegramBotStatus(): TelegramBotStatus {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const isConfigured = Boolean(token && token.trim().length > 10);
  const isOwnerConfigured = Boolean(ownerChatId && ownerChatId.trim().length > 0);
  const isSecretConfigured = Boolean(webhookSecret && webhookSecret.trim().length > 0);

  let message = 'Telegram bot username is registered as @docunexa_bot.';
  if (isConfigured && isOwnerConfigured) {
    message = 'Telegram support bot is securely configured with live token and verified owner chat routing.';
  } else if (isConfigured && !isOwnerConfigured) {
    message = 'Telegram bot token is active, but TELEGRAM_OWNER_CHAT_ID is awaiting configuration.';
  } else {
    message = 'Telegram bot is dormant awaiting server-side TELEGRAM_BOT_TOKEN.';
  }

  return {
    username: TELEGRAM_BOT_USERNAME,
    handle: TELEGRAM_BOT_HANDLE,
    url: TELEGRAM_BOT_URL,
    configured: isConfigured,
    ownerConfigured: isOwnerConfigured,
    webhookSecretConfigured: isSecretConfigured,
    message,
  };
}

/**
 * Fetches Telegram webhook status from Telegram's official Bot API (getWebhookInfo)
 * Never exposes the bot token.
 */
export async function getTelegramWebhookInfo(): Promise<{
  success: boolean;
  configured: boolean;
  info?: {
    url: string;
    hasCustomCertificate: boolean;
    pendingUpdateCount: number;
    lastErrorDate?: string | null;
    lastErrorMessage?: string | null;
    maxConnections?: number;
  };
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return {
      success: false,
      configured: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured in server environment.',
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        success: false,
        configured: false,
        error: data.description || `Telegram API returned status ${res.status}`,
      };
    }

    const result = data.result || {};
    return {
      success: true,
      configured: Boolean(result.url && result.url.length > 0),
      info: {
        url: result.url || '',
        hasCustomCertificate: Boolean(result.has_custom_certificate),
        pendingUpdateCount: result.pending_update_count || 0,
        lastErrorDate: result.last_error_date ? new Date(result.last_error_date * 1000).toISOString() : null,
        lastErrorMessage: result.last_error_message || null,
        maxConnections: result.max_connections,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      error: err.message || 'Network error querying Telegram getWebhookInfo.',
    };
  }
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: { reply_to_message_id?: number; parse_mode?: string }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };

  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'Markdown',
      disable_web_page_preview: true,
    };
    if (options?.reply_to_message_id) {
      body.reply_to_message_id = options.reply_to_message_id;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return { ok: false, error: data.description || `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Copies a message (including attachments, photo, document, voice) from one chat to another
 */
export async function copyTelegramMessage(
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  options?: { caption?: string; reply_to_message_id?: number }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };

  try {
    const body: any = {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    };
    if (options?.caption) body.caption = options.caption;
    if (options?.reply_to_message_id) body.reply_to_message_id = options.reply_to_message_id;

    const res = await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return { ok: false, error: data.description || `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Saves a persistent mapping from owner's received message ID to the customer's chat
 */
export async function saveTelegramMapping(
  ownerMessageId: number | string,
  data: TelegramMappingData
): Promise<void> {
  const key = String(ownerMessageId);
  localMappingCache.set(key, data);

  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  // 1. Try dedicated telegram_support_mappings table
  try {
    const { error } = await (admin.from('telegram_support_mappings' as any) as any)
      .upsert({
        owner_message_id: key,
        customer_chat_id: String(data.customer_chat_id),
        customer_message_id: data.customer_message_id ? String(data.customer_message_id) : null,
        customer_user_id: data.customer_user_id ? String(data.customer_user_id) : null,
        customer_name: data.customer_name || null,
        ticket_ref: data.ticket_ref,
        created_at: nowIso,
      });
    if (!error) return;
  } catch {
    // Fall back to admin_audit_logs
  }

  // 2. Resilient fallback: store inside admin_audit_logs
  try {
    await admin.from('admin_audit_logs').insert({
      admin_user_id: null,
      action: 'telegram_chat_mapping',
      metadata: {
        owner_message_id: key,
        customer_chat_id: String(data.customer_chat_id),
        customer_message_id: data.customer_message_id,
        customer_user_id: data.customer_user_id,
        customer_name: data.customer_name,
        ticket_ref: data.ticket_ref,
        createdAt: nowIso,
      },
      reason: `Telegram mapping: owner msg ${key} -> customer ${data.customer_chat_id} (${data.ticket_ref})`,
    });
  } catch (err) {
    console.error('[tg-mapping-save] Fallback error:', err);
  }
}

/**
 * Retrieves the customer mapping for an owner's reply
 */
export async function getTelegramMapping(
  ownerMessageId: number | string
): Promise<TelegramMappingData | null> {
  const key = String(ownerMessageId);
  if (localMappingCache.has(key)) {
    return localMappingCache.get(key)!;
  }

  const admin = createAdminSupabaseClient();

  // 1. Try dedicated table
  try {
    const { data, error } = await (admin.from('telegram_support_mappings' as any) as any)
      .select('*')
      .eq('owner_message_id', key)
      .single();

    if (!error && data) {
      const dataRecord = data as any;
      const result: TelegramMappingData = {
        customer_chat_id: dataRecord.customer_chat_id,
        customer_message_id: dataRecord.customer_message_id ? Number(dataRecord.customer_message_id) : undefined,
        customer_name: dataRecord.customer_name || undefined,
        customer_user_id: dataRecord.customer_user_id || undefined,
        ticket_ref: dataRecord.ticket_ref,
      };
      localMappingCache.set(key, result);
      return result;
    }
  } catch {
    // Fallback
  }

  // 2. Try admin_audit_logs
  try {
    const { data: auditData, error: auditErr } = await admin
      .from('admin_audit_logs')
      .select('metadata')
      .eq('action', 'telegram_chat_mapping')
      .filter('metadata->>owner_message_id', 'eq', key)
      .limit(1);

    if (!auditErr && auditData && auditData.length > 0) {
      const meta = (auditData[0].metadata as any) || {};
      const result: TelegramMappingData = {
        customer_chat_id: meta.customer_chat_id,
        customer_message_id: meta.customer_message_id ? Number(meta.customer_message_id) : undefined,
        customer_name: meta.customer_name || undefined,
        customer_user_id: meta.customer_user_id || undefined,
        ticket_ref: meta.ticket_ref || 'TG-UNKNOWN',
      };
      localMappingCache.set(key, result);
      return result;
    }
  } catch (err) {
    console.error('[tg-mapping-get] Fallback query error:', err);
  }

  return null;
}

/**
 * Checks whether an incoming Telegram update has already been processed (idempotency)
 */
export async function isTelegramUpdateProcessed(updateId: number | string): Promise<boolean> {
  const key = String(updateId);
  if (processedUpdatesCache.has(key)) return true;

  const admin = createAdminSupabaseClient();

  // 1. Try dedicated table
  try {
    const { data } = await (admin.from('telegram_processed_updates' as any) as any)
      .select('update_id')
      .eq('update_id', key)
      .limit(1);

    if (data && data.length > 0) {
      processedUpdatesCache.add(key);
      return true;
    }
  } catch {
    // Fallback
  }

  // 2. Try admin_audit_logs
  try {
    const { data: auditData } = await admin
      .from('admin_audit_logs')
      .select('id')
      .eq('action', 'telegram_processed_update')
      .filter('metadata->>update_id', 'eq', key)
      .limit(1);

    if (auditData && auditData.length > 0) {
      processedUpdatesCache.add(key);
      return true;
    }
  } catch {
    // Non-blocking
  }

  return false;
}

/**
 * Marks a Telegram update as processed
 */
export async function markTelegramUpdateProcessed(updateId: number | string): Promise<void> {
  const key = String(updateId);
  processedUpdatesCache.add(key);

  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  try {
    await (admin.from('telegram_processed_updates' as any) as any)
      .insert({ update_id: key, processed_at: nowIso });
    return;
  } catch {
    // Fallback
  }

  try {
    await admin.from('admin_audit_logs').insert({
      admin_user_id: null,
      action: 'telegram_processed_update',
      metadata: { update_id: key, processedAt: nowIso },
    });
  } catch {
    // Ignore
  }
}

/**
 * Delivers website support ticket alerts to the configured owner via Telegram
 */
export async function notifyOwnerOfWebsiteTicket(ticket: {
  ticketId: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();

  if (!token || !ownerChatId) {
    return false;
  }

  const notificationText = `🌐 *New Website Support Ticket*
🔖 *Ticket ID*: \`${ticket.ticketId}\`
📁 *Category*: *${ticket.category}*
👤 *User*: ${ticket.name} (${ticket.email})
📌 *Subject*: ${ticket.subject}

📝 *Message*:
${ticket.message}

🔗 *Review & Respond in Admin*: https://docunexa.pro.et/admin/support`;

  const result = await sendTelegramMessage(ownerChatId, notificationText);
  return result.ok;
}

/**
 * Main Webhook Dispatcher
 * Implements: Secret verification, idempotency, customer forwarding, and owner reply routing.
 */
export async function handleTelegramWebhookUpdate(
  update: any,
  secretTokenHeader?: string | null
): Promise<{ ok: boolean; handled: string; error?: string }> {
  // 1. Verify Secret Token if TELEGRAM_WEBHOOK_SECRET is set
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (expectedSecret && expectedSecret.length > 0) {
    if (!secretTokenHeader || secretTokenHeader !== expectedSecret) {
      return { ok: false, handled: 'rejected', error: 'Invalid or missing X-Telegram-Bot-Api-Secret-Token' };
    }
  }

  // 2. Validate update structure
  if (!update || typeof update !== 'object') {
    return { ok: true, handled: 'ignored_invalid_payload' };
  }

  const updateId = update.update_id;
  if (!updateId) {
    return { ok: true, handled: 'ignored_no_update_id' };
  }

  // 3. Idempotency Check
  const alreadyProcessed = await isTelegramUpdateProcessed(updateId);
  if (alreadyProcessed) {
    return { ok: true, handled: 'duplicate_ignored' };
  }
  await markTelegramUpdateProcessed(updateId);

  const message = update.message || update.edited_message;
  if (!message || !message.chat) {
    return { ok: true, handled: 'ignored_no_message' };
  }

  const chatId = message.chat.id;
  const senderId = String(chatId);
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  const isOwner = Boolean(ownerChatId && senderId === ownerChatId);

  // ---------------------------------------------------------------------------
  // A. OWNER ACTIONS: Replying on behalf of Support
  // ---------------------------------------------------------------------------
  if (isOwner) {
    const replyToMessage = message.reply_to_message;

    if (replyToMessage) {
      const targetMessageId = replyToMessage.message_id;
      const mapping = await getTelegramMapping(targetMessageId);

      if (mapping) {
        let sent = false;
        // If owner replied with text
        if (message.text) {
          const supportReplyText = `💬 *DocuNexa Support Reply:*\n\n${message.text}\n\n_Ref: #${mapping.ticket_ref}_`;
          const res = await sendTelegramMessage(mapping.customer_chat_id, supportReplyText, {
            reply_to_message_id: mapping.customer_message_id,
          });
          sent = res.ok;
        } else {
          // If owner replied with photo, voice, document, etc.
          const res = await copyTelegramMessage(
            mapping.customer_chat_id,
            message.chat.id,
            message.message_id,
            { reply_to_message_id: mapping.customer_message_id }
          );
          sent = res.ok;
        }

        if (sent) {
          await sendTelegramMessage(
            chatId,
            `✅ *Reply delivered to customer* (Ticket #${mapping.ticket_ref}).`,
            { reply_to_message_id: message.message_id }
          );
          return { ok: true, handled: 'owner_reply_delivered' };
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ *Failed to deliver reply to customer.* Telegram API error or user blocked the bot.`,
            { reply_to_message_id: message.message_id }
          );
          return { ok: false, handled: 'owner_delivery_failed' };
        }
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ *Could not locate customer ticket for this message.*\nReplies must be sent directly to forwarded customer messages or support notifications.`,
          { reply_to_message_id: message.message_id }
        );
        return { ok: true, handled: 'owner_mapping_not_found' };
      }
    }

    // Owner sent a standalone message (not a reply)
    const textLower = (message.text || '').trim().toLowerCase();
    if (textLower === '/status') {
      const webhookInfo = await getTelegramWebhookInfo();
      await sendTelegramMessage(
        chatId,
        `📊 *DocuNexa Support Bot Status:*\n` +
          `• Webhook: *${webhookInfo.configured ? 'Configured' : 'Not Set'}*\n` +
          `• Pending Updates: *${webhookInfo.info?.pendingUpdateCount || 0}*\n` +
          `• Webhook Secret: *${expectedSecret ? 'Active' : 'Unset'}*\n` +
          `• Owner Chat ID: *${ownerChatId}*\n` +
          `• Live Domain: https://docunexa.pro.et`
      );
      return { ok: true, handled: 'owner_status_command' };
    }

    await sendTelegramMessage(
      chatId,
      `💡 *DocuNexa Owner Console:*\nTo reply to a customer, please tap or click *Reply* directly on their incoming message card.`
    );
    return { ok: true, handled: 'owner_guidance' };
  }

  // ---------------------------------------------------------------------------
  // B. CUSTOMER ACTIONS: Submitting a Support Query or FAQ Command
  // ---------------------------------------------------------------------------
  const customerName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(' ') || 'Customer';
  const customerUsername = message.from?.username ? `@${message.from.username}` : '';
  const customerUserId = message.from?.id ? String(message.from.id) : senderId;
  const rawText = message.text || '';

  // 1. Check for automated FAQ answers
  const faqReply = getTelegramReplyForText(rawText);
  if (faqReply && rawText.startsWith('/')) {
    await sendTelegramMessage(chatId, faqReply);
    return { ok: true, handled: 'faq_reply' };
  }

  // 2. Create customer ticket reference
  const ticketRef = `TG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // 3. Send instant customer acknowledgment (normally replies within 24 hours)
  const ackMessage = `👋 *Thank you for contacting DocuNexa Support!*

We have received your message. Our support team normally reviews and replies within 24 hours.

🔖 *Ticket Reference*: \`#${ticketRef}\`
🌐 Official Support Form: https://docunexa.pro.et/support

You can continue replying to this chat at any time.`;

  await sendTelegramMessage(chatId, ackMessage, { reply_to_message_id: message.message_id });

  // 4. Forward to configured owner chat if available
  if (ownerChatId) {
    const ownerCardText = `📩 *New Telegram Support Message*
🔖 *Ticket Reference*: \`#${ticketRef}\`
👤 *Sender*: ${customerName} ${customerUsername}
🆔 *Telegram User ID*: \`${customerUserId}\`
💬 *Message*:
${rawText || '[Attachment / Media Message]'}

👉 *Reply directly to this message to send an answer to the customer.*`;

    const ownerCardRes = await sendTelegramMessage(ownerChatId, ownerCardText);

    if (ownerCardRes.ok && ownerCardRes.messageId) {
      // If customer sent media (photo, voice, document, etc.), forward it too
      if (!rawText || message.photo || message.document || message.voice || message.video) {
        await copyTelegramMessage(ownerChatId, chatId, message.message_id);
      }

      // Persist mapping from owner's header message ID to customer chat
      await saveTelegramMapping(ownerCardRes.messageId, {
        customer_chat_id: chatId,
        customer_message_id: message.message_id,
        customer_name: customerName,
        customer_user_id: customerUserId,
        ticket_ref: ticketRef,
      });
    }
  }

  return { ok: true, handled: 'customer_inquiry_forwarded' };
}
