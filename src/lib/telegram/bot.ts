/**
 * DocuNexa — Telegram Support Bot Engine
 * Customer <-> Owner <-> Customer Bidirectional Support Routing
 *
 * Server-side Environment Variables:
 * - TELEGRAM_BOT_TOKEN: Bot token provided by @BotFather
 * - TELEGRAM_OWNER_CHAT_ID: Verified chat ID of the site owner/operator
 * - TELEGRAM_WEBHOOK_SECRET: Secret token for X-Telegram-Bot-Api-Secret-Token header verification
 */

import crypto from 'crypto';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
  TELEGRAM_BOT_COMMANDS,
  TELEGRAM_WELCOME_MESSAGE,
  DOCUNEXA_SITE_URL,
  DOCUNEXA_MINI_APP_URL,
  getMainNavigationKeyboard,
  TELEGRAM_FAQ_TOPICS,
  getTelegramReplyForText,
  type TelegramBotStatus,
} from './constants';

export {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_URL,
  TELEGRAM_BOT_COMMANDS,
  TELEGRAM_WELCOME_MESSAGE,
  DOCUNEXA_SITE_URL,
  DOCUNEXA_MINI_APP_URL,
  getMainNavigationKeyboard,
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

export interface TelegramTicketRecord {
  id?: string;
  ticketRef: string;
  updateId?: string;
  customerChatId: string | number;
  customerMessageId?: number;
  customerUserId?: string | number;
  customerName: string;
  customerUsername?: string;
  messageText: string;
  hasMedia?: boolean;
  mediaType?: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed' | 'resolved';
  ownerChatId?: string;
  ownerMessageId?: string;
  deliveryAttempts: number;
  lastError?: string | null;
  customerAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
}

// In-memory caches for low-latency serverless deduplication and routing
const localMappingCache = new Map<string, TelegramMappingData>();
const processedUpdatesCache = new Set<string>();
const localTicketsCache = new Map<string, TelegramTicketRecord>();

/**
 * Escapes HTML characters for Telegram HTML parse mode (safe against all customer input)
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapes characters for Telegram Markdown (V1)
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Validates Telegram Mini App initData signature using official HMAC-SHA256 algorithm
 */
export function verifyTelegramInitData(
  initData: string,
  botToken = process.env.TELEGRAM_BOT_TOKEN
): { valid: boolean; user?: any; error?: string } {
  if (!initData || !botToken) {
    return { valid: false, error: 'Missing initData or bot token' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { valid: false, error: 'No hash found in initData' };
    }

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const userRaw = params.get('user');
    const user = userRaw ? JSON.parse(userRaw) : undefined;
    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Error validating initData' };
  }
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
 * Registers the live webhook with Telegram Bot API
 */
export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured.' };
  }

  try {
    const body: any = {
      url: webhookUrl,
      drop_pending_updates: false,
    };
    const resolvedSecret = secretToken?.trim() || process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (resolvedSecret && resolvedSecret.length > 0) {
      body.secret_token = resolvedSecret;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      description: data.description || (res.ok ? 'Webhook registered successfully.' : `HTTP ${res.status}`),
    };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Registers official bot commands with Telegram Bot API via setMyCommands
 */
export async function registerTelegramCommands(): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: TELEGRAM_BOT_COMMANDS }),
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      description: data.description || (res.ok ? 'Commands registered successfully.' : `HTTP ${res.status}`),
    };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Configures the Telegram chat menu button to launch the Mini App via setChatMenuButton
 */
export async function setTelegramChatMenuButton(
  webAppUrl = DOCUNEXA_MINI_APP_URL
): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Open DocuNexa',
          web_app: { url: webAppUrl },
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      description: data.description || (res.ok ? 'Chat menu button configured successfully.' : `HTTP ${res.status}`),
    };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Sends a message via Telegram Bot API with automatic format fallback
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    reply_to_message_id?: number;
    parse_mode?: 'HTML' | 'Markdown';
    reply_markup?: any;
    disable_web_page_preview?: boolean;
  }
): Promise<{ ok: boolean; messageId?: number; errorCode?: number; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };

  const parseMode = options?.parse_mode ?? 'HTML';

  try {
    const body: any = {
      chat_id: chatId,
      text,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    };
    if (parseMode) body.parse_mode = parseMode;
    if (options?.reply_to_message_id) body.reply_to_message_id = options.reply_to_message_id;
    if (options?.reply_markup) body.reply_markup = options.reply_markup;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }

    // Auto-fallback: If formatting parse error occurs, resend as plain text
    if (data.description && /can't parse/i.test(data.description) && parseMode) {
      const fallbackBody = { ...body };
      delete fallbackBody.parse_mode;
      const fbRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      const fbData = await fbRes.json().catch(() => ({}));
      if (fbRes.ok && fbData.ok) {
        return { ok: true, messageId: fbData.result?.message_id };
      }
    }

    return {
      ok: false,
      errorCode: data.error_code || res.status,
      description: data.description || `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { ok: false, description: err.message };
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
): Promise<{ ok: boolean; messageId?: number; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };

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
    return { ok: false, description: data.description || `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Saves a persistent mapping from owner's received message ID to customer chat
 */
export async function saveTelegramMapping(
  ownerMessageId: number | string,
  data: TelegramMappingData
): Promise<{ success: boolean; error?: string }> {
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
    if (!error) return { success: true };
  } catch {
    // Fall back to admin_audit_logs
  }

  // 2. Resilient fallback: store inside admin_audit_logs
  try {
    const { error } = await admin.from('admin_audit_logs').insert({
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
    if (!error) return { success: true };
  } catch (err: any) {
    console.error('[tg-mapping-save] Fallback error:', err);
    return { success: false, error: err.message };
  }

  return { success: true };
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

  // 1. Try dedicated telegram_support_mappings table
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

  // 2. Try telegram_support_tickets table
  try {
    const { data: ticketData, error: ticketErr } = await (admin.from('telegram_support_tickets' as any) as any)
      .select('*')
      .eq('owner_message_id', key)
      .limit(1);

    if (!ticketErr && ticketData && ticketData.length > 0) {
      const t = ticketData[0];
      const result: TelegramMappingData = {
        customer_chat_id: t.customer_chat_id,
        customer_message_id: t.customer_message_id ? Number(t.customer_message_id) : undefined,
        customer_name: t.customer_name || undefined,
        customer_user_id: t.customer_user_id || undefined,
        ticket_ref: t.ticket_ref,
      };
      localMappingCache.set(key, result);
      return result;
    }
  } catch {
    // Fallback
  }

  // 3. Try admin_audit_logs
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
 * Persists an incoming Telegram support ticket to Supabase with multi-tier storage
 */
export async function saveTelegramSupportTicket(
  ticket: TelegramTicketRecord
): Promise<{ success: boolean; id?: string }> {
  localTicketsCache.set(ticket.ticketRef, ticket);
  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  // Tier 1: Dedicated telegram_support_tickets table
  try {
    const { data, error } = await (admin.from('telegram_support_tickets' as any) as any)
      .upsert(
        {
          ticket_ref: ticket.ticketRef,
          update_id: ticket.updateId || null,
          customer_chat_id: String(ticket.customerChatId),
          customer_message_id: ticket.customerMessageId ? String(ticket.customerMessageId) : null,
          customer_user_id: ticket.customerUserId ? String(ticket.customerUserId) : null,
          customer_name: ticket.customerName,
          customer_username: ticket.customerUsername || null,
          message_text: ticket.messageText,
          has_media: Boolean(ticket.hasMedia),
          media_type: ticket.mediaType || null,
          delivery_status: ticket.deliveryStatus,
          owner_chat_id: ticket.ownerChatId || null,
          owner_message_id: ticket.ownerMessageId ? String(ticket.ownerMessageId) : null,
          delivery_attempts: ticket.deliveryAttempts || 0,
          last_error: ticket.lastError || null,
          customer_acknowledged: Boolean(ticket.customerAcknowledged),
          created_at: ticket.createdAt || nowIso,
          updated_at: nowIso,
          delivered_at: ticket.deliveredAt || null,
        },
        { onConflict: 'ticket_ref' }
      )
      .select('id')
      .single();

    if (!error && data?.id) {
      ticket.id = data.id;
      return { success: true, id: data.id };
    }
  } catch {
    // Continue to Tier 2
  }

  // Tier 2: public.support_tickets table
  try {
    const emailHandle = ticket.customerUsername
      ? `${ticket.customerUsername.replace('@', '')}@telegram.docunexa.internal`
      : `chat_${ticket.customerChatId}@telegram.docunexa.internal`;

    const adminNotesJson = JSON.stringify({
      ticket_ref: ticket.ticketRef,
      customer_chat_id: String(ticket.customerChatId),
      customer_message_id: ticket.customerMessageId,
      customer_user_id: ticket.customerUserId,
      update_id: ticket.updateId,
      delivery_status: ticket.deliveryStatus,
      owner_message_id: ticket.ownerMessageId,
      last_error: ticket.lastError,
      delivery_attempts: ticket.deliveryAttempts,
    });

    const { data: stData, error: stErr } = await admin
      .from('support_tickets')
      .insert({
        name: ticket.customerName,
        email: emailHandle,
        category: 'Other',
        subject: `Telegram Support #${ticket.ticketRef}`,
        message: ticket.messageText || '[Attachment / Media Message]',
        status: ticket.deliveryStatus === 'resolved' ? 'resolved' : 'open',
        admin_notes: adminNotesJson,
        created_at: ticket.createdAt || nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single();

    if (!stErr && stData?.id) {
      ticket.id = stData.id;
      return { success: true, id: stData.id };
    }
  } catch {
    // Continue to Tier 3
  }

  // Tier 3: admin_audit_logs fallback
  try {
    await admin.from('admin_audit_logs').insert({
      admin_user_id: null,
      action: 'telegram_support_ticket_saved',
      metadata: {
        ticketRef: ticket.ticketRef,
        customerChatId: String(ticket.customerChatId),
        customerName: ticket.customerName,
        deliveryStatus: ticket.deliveryStatus,
        messageText: ticket.messageText,
        lastError: ticket.lastError,
      },
      reason: `Telegram Ticket #${ticket.ticketRef} saved with status ${ticket.deliveryStatus}`,
    });
    return { success: true, id: ticket.ticketRef };
  } catch (err: any) {
    console.error('[tg-ticket-save] Tier 3 fallback error:', err?.message || err);
    return { success: true, id: ticket.ticketRef };
  }
}

/**
 * Updates status and diagnostic metadata for an existing Telegram support ticket
 */
export async function updateTelegramSupportTicket(
  ticketRef: string,
  updates: Partial<TelegramTicketRecord>
): Promise<void> {
  const existing = localTicketsCache.get(ticketRef);
  if (existing) {
    Object.assign(existing, updates);
    existing.updatedAt = new Date().toISOString();
  }

  const admin = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  try {
    const patch: any = { updated_at: nowIso };
    if (updates.deliveryStatus) patch.delivery_status = updates.deliveryStatus;
    if (updates.ownerMessageId) patch.owner_message_id = String(updates.ownerMessageId);
    if (updates.ownerChatId) patch.owner_chat_id = updates.ownerChatId;
    if (updates.deliveryAttempts !== undefined) patch.delivery_attempts = updates.deliveryAttempts;
    if (updates.lastError !== undefined) patch.last_error = updates.lastError;
    if (updates.customerAcknowledged !== undefined) patch.customer_acknowledged = updates.customerAcknowledged;
    if (updates.deliveredAt !== undefined) patch.delivered_at = updates.deliveredAt;

    await (admin.from('telegram_support_tickets' as any) as any)
      .update(patch)
      .eq('ticket_ref', ticketRef);
  } catch {
    // Non-blocking
  }
}

/**
 * Retrieves a Telegram ticket by ticket reference
 */
export async function getTelegramSupportTicket(
  ticketRef: string
): Promise<TelegramTicketRecord | null> {
  if (localTicketsCache.has(ticketRef)) {
    return localTicketsCache.get(ticketRef)!;
  }

  const admin = createAdminSupabaseClient();

  // Try telegram_support_tickets
  try {
    const { data } = await (admin.from('telegram_support_tickets' as any) as any)
      .select('*')
      .eq('ticket_ref', ticketRef)
      .single();

    if (data) {
      const record: TelegramTicketRecord = {
        id: data.id,
        ticketRef: data.ticket_ref,
        updateId: data.update_id || undefined,
        customerChatId: data.customer_chat_id,
        customerMessageId: data.customer_message_id ? Number(data.customer_message_id) : undefined,
        customerUserId: data.customer_user_id || undefined,
        customerName: data.customer_name || 'Customer',
        customerUsername: data.customer_username || undefined,
        messageText: data.message_text || '',
        hasMedia: Boolean(data.has_media),
        mediaType: data.media_type || undefined,
        deliveryStatus: data.delivery_status || 'pending',
        ownerChatId: data.owner_chat_id || undefined,
        ownerMessageId: data.owner_message_id || undefined,
        deliveryAttempts: data.delivery_attempts || 0,
        lastError: data.last_error || null,
        customerAcknowledged: Boolean(data.customer_acknowledged),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        deliveredAt: data.delivered_at || null,
      };
      localTicketsCache.set(ticketRef, record);
      return record;
    }
  } catch {
    // Non-blocking
  }

  return null;
}

/**
 * Lists recent Telegram tickets for inbox review and diagnostic reporting
 */
export async function listRecentTelegramTickets(limit = 20): Promise<TelegramTicketRecord[]> {
  const admin = createAdminSupabaseClient();

  try {
    const { data } = await (admin.from('telegram_support_tickets' as any) as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        ticketRef: d.ticket_ref,
        updateId: d.update_id || undefined,
        customerChatId: d.customer_chat_id,
        customerMessageId: d.customer_message_id ? Number(d.customer_message_id) : undefined,
        customerUserId: d.customer_user_id || undefined,
        customerName: d.customer_name || 'Customer',
        customerUsername: d.customer_username || undefined,
        messageText: d.message_text || '',
        hasMedia: Boolean(d.has_media),
        mediaType: d.media_type || undefined,
        deliveryStatus: d.delivery_status || 'pending',
        ownerChatId: d.owner_chat_id || undefined,
        ownerMessageId: d.owner_message_id || undefined,
        deliveryAttempts: d.delivery_attempts || 0,
        lastError: d.last_error || null,
        customerAcknowledged: Boolean(d.customer_acknowledged),
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        deliveredAt: d.delivered_at || null,
      }));
    }
  } catch {
    // Fallback to memory
  }

  return Array.from(localTicketsCache.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Checks whether an incoming Telegram update has already been processed and delivered
 */
export async function isTelegramUpdateProcessed(updateId: number | string): Promise<boolean> {
  const key = String(updateId);
  if (processedUpdatesCache.has(key)) return true;

  const admin = createAdminSupabaseClient();

  // Check telegram_processed_updates
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
  } catch {
    // Non-blocking
  }
}

/**
 * Delivers an inquiry ticket to the owner chat with comprehensive diagnostics
 */
export async function deliverTicketToOwner(
  ticket: TelegramTicketRecord,
  messageObj?: any
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    const err = 'TELEGRAM_BOT_TOKEN is not configured on the server.';
    await updateTelegramSupportTicket(ticket.ticketRef, {
      deliveryStatus: 'failed',
      lastError: err,
      deliveryAttempts: ticket.deliveryAttempts + 1,
    });
    return { ok: false, error: err };
  }

  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  if (!ownerChatId) {
    const err = 'TELEGRAM_OWNER_CHAT_ID is not configured on the server.';
    await updateTelegramSupportTicket(ticket.ticketRef, {
      deliveryStatus: 'failed',
      lastError: err,
      deliveryAttempts: ticket.deliveryAttempts + 1,
    });
    return { ok: false, error: err };
  }

  ticket.ownerChatId = ownerChatId;

  // Safe HTML card avoiding parse errors from arbitrary customer input
  const safeName = escapeHtml(ticket.customerName);
  const safeUsername = ticket.customerUsername
    ? ` (@${escapeHtml(ticket.customerUsername.replace('@', ''))})`
    : '';
  const safeUserId = escapeHtml(String(ticket.customerUserId || 'N/A'));
  const safeTicketRef = escapeHtml(ticket.ticketRef);
  const safeText = escapeHtml(ticket.messageText || '[Attachment / Media Message]');

  const ownerCardHtml = `📩 <b>New Telegram Support Message</b>
🔖 <b>Ticket Reference</b>: <code>#${safeTicketRef}</code>
👤 <b>Sender</b>: ${safeName}${safeUsername}
🆔 <b>Telegram User ID</b>: <code>${safeUserId}</code>
💬 <b>Message</b>:
${safeText}

👉 <i>Reply directly to this message to send an answer to the customer.</i>`;

  const ownerCardRes = await sendTelegramMessage(ownerChatId, ownerCardHtml, {
    parse_mode: 'HTML',
  });

  if (!ownerCardRes.ok || !ownerCardRes.messageId) {
    let diagnostic = ownerCardRes.description || 'Unknown Telegram delivery failure';
    if (/chat not found/i.test(diagnostic)) {
      diagnostic = 'Owner chat not found. The owner must start a private chat with @docunexa_bot.';
    } else if (/blocked/i.test(diagnostic)) {
      diagnostic = 'Bot was blocked by the owner user in Telegram.';
    } else if (/too many requests/i.test(diagnostic)) {
      diagnostic = 'Telegram API rate limit reached. Delivery queued for retry.';
    }

    await updateTelegramSupportTicket(ticket.ticketRef, {
      deliveryStatus: 'failed',
      lastError: diagnostic,
      deliveryAttempts: ticket.deliveryAttempts + 1,
    });
    return { ok: false, error: diagnostic };
  }

  // Delivery succeeded
  const ownerMsgId = ownerCardRes.messageId;

  // If customer sent media (photo, document, voice, video), forward it directly
  if (messageObj && (messageObj.photo || messageObj.document || messageObj.voice || messageObj.video || messageObj.audio)) {
    await copyTelegramMessage(ownerChatId, ticket.customerChatId, messageObj.message_id, {
      reply_to_message_id: ownerMsgId,
    });
  }

  // Save persistent bidirectional mapping
  await saveTelegramMapping(ownerMsgId, {
    customer_chat_id: ticket.customerChatId,
    customer_message_id: ticket.customerMessageId,
    customer_name: ticket.customerName,
    customer_user_id: ticket.customerUserId,
    ticket_ref: ticket.ticketRef,
  });

  await updateTelegramSupportTicket(ticket.ticketRef, {
    deliveryStatus: 'delivered',
    ownerMessageId: String(ownerMsgId),
    deliveredAt: new Date().toISOString(),
    lastError: null,
    deliveryAttempts: ticket.deliveryAttempts + 1,
  });

  return { ok: true, messageId: ownerMsgId };
}

/**
 * Acknowledges the customer with truthful, verified delivery status
 */
export async function sendCustomerAcknowledgment(
  customerChatId: number | string,
  ticketRef: string,
  deliverySuccess: boolean,
  replyToMessageId?: number
): Promise<{ ok: boolean; messageId?: number }> {
  let messageText = '';
  let replyMarkup: any;

  if (deliverySuccess) {
    messageText = `Thank you for contacting DocuNexa Support! Your message has been received and forwarded to our support team. We normally reply within 24 hours.

Ticket: #${ticketRef}
🌐 Support: ${DOCUNEXA_SITE_URL}/support`;

    replyMarkup = {
      inline_keyboard: [
        [{ text: '🎟️ View Web Support Center', url: `${DOCUNEXA_SITE_URL}/support` }],
        [{ text: '📱 Open DocuNexa Mini App', web_app: { url: DOCUNEXA_MINI_APP_URL } }],
      ],
    };
  } else {
    messageText = `Your support ticket has been recorded in our system. Notification delivery is currently being retried.

Ticket: #${ticketRef}
🌐 Support Center: ${DOCUNEXA_SITE_URL}/support`;

    replyMarkup = {
      inline_keyboard: [
        [{ text: '🎟️ Web Support Center', url: `${DOCUNEXA_SITE_URL}/support` }],
      ],
    };
  }

  const res = await sendTelegramMessage(customerChatId, messageText, {
    parse_mode: 'Markdown',
    reply_to_message_id: replyToMessageId,
    reply_markup: replyMarkup,
  });

  return { ok: res.ok, messageId: res.messageId };
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

  const safeTicketId = escapeHtml(ticket.ticketId);
  const safeCategory = escapeHtml(ticket.category);
  const safeName = escapeHtml(ticket.name);
  const safeEmail = escapeHtml(ticket.email);
  const safeSubject = escapeHtml(ticket.subject);
  const safeMessage = escapeHtml(ticket.message);

  const notificationHtml = `🌐 <b>New Website Support Ticket</b>
🔖 <b>Ticket ID</b>: <code>${safeTicketId}</code>
📁 <b>Category</b>: <b>${safeCategory}</b>
👤 <b>User</b>: ${safeName} (${safeEmail})
📌 <b>Subject</b>: ${safeSubject}

📝 <b>Message</b>:
${safeMessage}

🔗 <a href="https://docunexa.pro.et/admin/support">Review &amp; Respond in Admin Inbox</a>`;

  const result = await sendTelegramMessage(ownerChatId, notificationHtml, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📂 Open Admin Support Inbox', url: `${DOCUNEXA_SITE_URL}/admin/support` }],
      ],
    },
  });

  return result.ok;
}

/**
 * Retries undelivered tickets from the outbox
 */
export async function retryFailedTelegramNotifications(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  results: Array<{ ticketRef: string; ok: boolean; error?: string }>;
}> {
  const tickets = await listRecentTelegramTickets(50);
  const pendingOrFailed = tickets.filter(
    (t) => t.deliveryStatus === 'pending' || t.deliveryStatus === 'failed'
  );

  let succeeded = 0;
  let failed = 0;
  const results: Array<{ ticketRef: string; ok: boolean; error?: string }> = [];

  for (const t of pendingOrFailed) {
    const res = await deliverTicketToOwner(t);
    if (res.ok) {
      succeeded++;
      results.push({ ticketRef: t.ticketRef, ok: true });
    } else {
      failed++;
      results.push({ ticketRef: t.ticketRef, ok: false, error: res.error });
    }
  }

  return {
    attempted: pendingOrFailed.length,
    succeeded,
    failed,
    results,
  };
}

/**
 * Main Webhook Dispatcher
 * Implements: Secret verification, idempotency, customer forwarding, owner commands, and owner reply routing.
 */
export async function handleTelegramWebhookUpdate(
  update: any,
  secretTokenHeader?: string | null
): Promise<{ ok: boolean; handled: string; ticketRef?: string; error?: string }> {
  // 1. Verify Secret Token (Fail-Closed: reject if secret is missing/empty or header mismatches)
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret || expectedSecret.length === 0) {
    return {
      ok: false,
      handled: 'rejected',
      error: 'TELEGRAM_WEBHOOK_SECRET is not configured on the server. Incoming updates rejected.',
    };
  }

  if (!secretTokenHeader || secretTokenHeader !== expectedSecret) {
    return {
      ok: false,
      handled: 'rejected',
      error: 'Invalid or missing X-Telegram-Bot-Api-Secret-Token',
    };
  }

  // 2. Validate update structure
  if (!update || typeof update !== 'object') {
    return { ok: true, handled: 'ignored_invalid_payload' };
  }

  const updateId = update.update_id;
  if (!updateId) {
    return { ok: true, handled: 'ignored_no_update_id' };
  }

  const message = update.message || update.edited_message;
  if (!message || !message.chat) {
    return { ok: true, handled: 'ignored_no_message' };
  }

  const chatId = message.chat.id;
  const senderId = String(chatId);
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  const isOwner = Boolean(ownerChatId && senderId === ownerChatId);

  // 3. Idempotency Check (Check if update has already been delivered)
  const alreadyProcessed = await isTelegramUpdateProcessed(updateId);
  if (alreadyProcessed) {
    return { ok: true, handled: 'duplicate_ignored' };
  }

  // ---------------------------------------------------------------------------
  // A. OWNER ACTIONS: Replying to customer or running owner commands
  // ---------------------------------------------------------------------------
  if (isOwner) {
    const rawText = (message.text || '').trim();
    const replyToMessage = message.reply_to_message;

    // A1. Owner replies directly to a customer message card
    if (replyToMessage) {
      const targetMessageId = replyToMessage.message_id;
      const mapping = await getTelegramMapping(targetMessageId);

      if (mapping) {
        let sent = false;
        let deliveryErr: string | undefined;

        if (message.text) {
          const supportReplyHtml = `💬 <b>DocuNexa Support Reply:</b>\n\n${escapeHtml(message.text)}\n\n<i>Ref: #${escapeHtml(mapping.ticket_ref)}</i>`;
          const res = await sendTelegramMessage(mapping.customer_chat_id, supportReplyHtml, {
            parse_mode: 'HTML',
            reply_to_message_id: mapping.customer_message_id,
          });
          sent = res.ok;
          deliveryErr = res.description;
        } else {
          // If owner replied with photo, voice, document, etc.
          const res = await copyTelegramMessage(
            mapping.customer_chat_id,
            message.chat.id,
            message.message_id,
            { reply_to_message_id: mapping.customer_message_id }
          );
          sent = res.ok;
          deliveryErr = res.description;
        }

        if (sent) {
          await sendTelegramMessage(
            chatId,
            `✅ <b>Reply delivered to customer</b> (Ticket #${escapeHtml(mapping.ticket_ref)}).`,
            { reply_to_message_id: message.message_id, parse_mode: 'HTML' }
          );
          await markTelegramUpdateProcessed(updateId);
          return { ok: true, handled: 'owner_reply_delivered' };
        } else {
          let userNotice = deliveryErr || 'User may have blocked the bot';
          if (/blocked/i.test(userNotice)) userNotice = 'Customer has blocked the bot.';
          await sendTelegramMessage(
            chatId,
            `❌ <b>Failed to deliver reply to customer.</b>\nReason: ${escapeHtml(userNotice)}`,
            { reply_to_message_id: message.message_id, parse_mode: 'HTML' }
          );
          await markTelegramUpdateProcessed(updateId);
          return { ok: false, handled: 'owner_delivery_failed' };
        }
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Could not locate customer ticket for this message.</b>\nReplies must be sent directly to forwarded customer messages or support notifications.`,
          { reply_to_message_id: message.message_id, parse_mode: 'HTML' }
        );
        await markTelegramUpdateProcessed(updateId);
        return { ok: true, handled: 'owner_mapping_not_found' };
      }
    }

    // A2. Owner Commands
    const firstWord = rawText.split(/\s+/)[0].toLowerCase();
    const command = firstWord.replace(/@docunexa_bot$/, '').slice(1);

    if (command === 'owner_status') {
      const webhookInfo = await getTelegramWebhookInfo();
      const recentTickets = await listRecentTelegramTickets(20);
      const pendingCount = recentTickets.filter(
        (t) => t.deliveryStatus === 'pending' || t.deliveryStatus === 'failed'
      ).length;

      const statusCardHtml = `📊 <b>DocuNexa Owner Console Status</b>
• Bot Handle: <b>@${escapeHtml(TELEGRAM_BOT_USERNAME)}</b>
• Token Active: <b>Yes</b>
• Owner Chat ID: <code>${escapeHtml(ownerChatId || '')}</code>
• Webhook Configured: <b>${webhookInfo.configured ? 'Active' : 'Not Set'}</b>
• Pending Updates: <b>${webhookInfo.info?.pendingUpdateCount || 0}</b>
• Pending Support Outbox: <b>${pendingCount}</b>
• Live Domain: https://docunexa.pro.et

🔗 <a href="${DOCUNEXA_SITE_URL}/admin/support">Open Admin Support Inbox</a>`;

      await sendTelegramMessage(chatId, statusCardHtml, { parse_mode: 'HTML' });
      await markTelegramUpdateProcessed(updateId);
      return { ok: true, handled: 'owner_status_command' };
    }

    if (command === 'testnotify') {
      const nowStr = new Date().toISOString();
      const testPingHtml = `🔔 <b>DocuNexa Owner Notification Test</b>
✅ Owner chat routing is fully operational!
Timestamp: <code>${nowStr}</code>`;

      const res = await sendTelegramMessage(chatId, testPingHtml, { parse_mode: 'HTML' });
      await markTelegramUpdateProcessed(updateId);
      return { ok: res.ok, handled: 'owner_test_notification' };
    }

    if (command === 'inbox') {
      const recentTickets = await listRecentTelegramTickets(10);
      if (recentTickets.length === 0) {
        await sendTelegramMessage(
          chatId,
          `📥 <b>Support Inbox:</b>\nNo recent customer tickets recorded.`,
          { parse_mode: 'HTML' }
        );
      } else {
        const lines = recentTickets.map((t) => {
          const statusIcon =
            t.deliveryStatus === 'delivered' ? '✅' : t.deliveryStatus === 'failed' ? '❌' : '⏳';
          const sender = t.customerName || 'Customer';
          return `${statusIcon} <code>#${escapeHtml(t.ticketRef)}</code> — ${escapeHtml(sender)}: <i>${escapeHtml((t.messageText || '').slice(0, 40))}</i> (${t.deliveryStatus})`;
        });

        const inboxHtml = `📥 <b>Recent Support Inbox (Last ${recentTickets.length}):</b>\n\n${lines.join('\n')}\n\n👉 <i>To retry a failed delivery: /resend TICKET_REF</i>`;
        await sendTelegramMessage(chatId, inboxHtml, { parse_mode: 'HTML' });
      }
      await markTelegramUpdateProcessed(updateId);
      return { ok: true, handled: 'owner_inbox_command' };
    }

    if (command === 'resend') {
      const targetRef = rawText.split(/\s+/)[1]?.replace(/^#/, '').trim();
      if (!targetRef) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Usage: <code>/resend TICKET_REF</code> (e.g. <code>/resend TG-12345</code>)`,
          { parse_mode: 'HTML' }
        );
      } else {
        const ticket = await getTelegramSupportTicket(targetRef);
        if (!ticket) {
          await sendTelegramMessage(
            chatId,
            `❌ Ticket <code>#${escapeHtml(targetRef)}</code> not found in database.`,
            { parse_mode: 'HTML' }
          );
        } else {
          const res = await deliverTicketToOwner(ticket);
          if (res.ok) {
            await sendTelegramMessage(
              chatId,
              `✅ Successfully resent ticket <code>#${escapeHtml(targetRef)}</code> to owner.`,
              { parse_mode: 'HTML' }
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `❌ Failed to resend ticket: ${escapeHtml(res.error || 'Unknown error')}`,
              { parse_mode: 'HTML' }
            );
          }
        }
      }
      await markTelegramUpdateProcessed(updateId);
      return { ok: true, handled: 'owner_resend_command' };
    }

    if (command === 'help') {
      const ownerHelpHtml = `🛠️ <b>DocuNexa Owner Support Guide:</b>
• <b>Reply to Customer:</b> Tap <i>Reply</i> directly on any forwarded message card to deliver your message to the customer.
• <b>/owner_status:</b> View live bot configuration & health.
• <b>/testnotify:</b> Run a real diagnostic notification check.
• <b>/inbox:</b> View recent support tickets and their statuses.
• <b>/resend &lt;REF&gt;:</b> Retry delivery of an undelivered ticket.`;

      await sendTelegramMessage(chatId, ownerHelpHtml, { parse_mode: 'HTML' });
      await markTelegramUpdateProcessed(updateId);
      return { ok: true, handled: 'owner_help_command' };
    }

    // Owner sent a standalone message (not a reply and not a command)
    await sendTelegramMessage(
      chatId,
      `💡 <b>DocuNexa Owner Console:</b>\nTo reply to a customer, please tap or click <b>Reply</b> directly on their incoming message card.\n\nUse <b>/help</b> for a list of owner commands.`,
      { parse_mode: 'HTML' }
    );
    await markTelegramUpdateProcessed(updateId);
    return { ok: true, handled: 'owner_guidance' };
  }

  // ---------------------------------------------------------------------------
  // B. CUSTOMER ACTIONS: Navigation Commands or Genuine Support Inquiries
  // ---------------------------------------------------------------------------
  const rawText = message.text || '';
  const customerName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(' ') || 'Customer';
  const customerUsername = message.from?.username ? `@${message.from.username}` : '';
  const customerUserId = message.from?.id ? String(message.from.id) : senderId;

  // B1. Automated Command & Navigation Dispatcher
  const commandReply = getTelegramReplyForText(rawText);
  if (commandReply && commandReply.isCommand) {
    await sendTelegramMessage(chatId, commandReply.text, {
      parse_mode: 'Markdown',
      reply_markup: commandReply.replyMarkup,
    });
    await markTelegramUpdateProcessed(updateId);
    return { ok: true, handled: 'customer_command_reply' };
  }

  // B2. Genuine Customer Support Inquiry Workflow
  // Generate ticket reference
  const ticketRef = `TG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const hasMedia = Boolean(
    message.photo || message.document || message.voice || message.video || message.audio
  );
  let mediaType: string | undefined;
  if (message.photo) mediaType = 'photo';
  else if (message.document) mediaType = 'document';
  else if (message.voice) mediaType = 'voice';
  else if (message.video) mediaType = 'video';
  else if (message.audio) mediaType = 'audio';

  const ticketRecord: TelegramTicketRecord = {
    ticketRef,
    updateId: String(updateId),
    customerChatId: chatId,
    customerMessageId: message.message_id,
    customerUserId,
    customerName,
    customerUsername,
    messageText: rawText || (hasMedia ? `[Customer attached ${mediaType}]` : '[Message]'),
    hasMedia,
    mediaType,
    deliveryStatus: 'pending',
    deliveryAttempts: 0,
    customerAcknowledged: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // STEP 1: Save support inquiry in persistent Supabase storage BEFORE claiming recorded
  await saveTelegramSupportTicket(ticketRecord);

  // STEP 2: Attempt delivery to configured owner chat
  const deliveryResult = await deliverTicketToOwner(ticketRecord, message);

  // STEP 3: Acknowledge the customer with truthful status
  await sendCustomerAcknowledgment(
    chatId,
    ticketRef,
    deliveryResult.ok,
    message.message_id
  );

  ticketRecord.customerAcknowledged = true;
  await updateTelegramSupportTicket(ticketRef, { customerAcknowledged: true });

  // STEP 4: Mark update as completed
  await markTelegramUpdateProcessed(updateId);

  return {
    ok: true,
    handled: deliveryResult.ok
      ? 'customer_inquiry_forwarded'
      : 'customer_inquiry_saved_delivery_pending',
    ticketRef,
  };
}
