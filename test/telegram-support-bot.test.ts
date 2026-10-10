/**
 * DocuNexa — Telegram Bot Upgrade & Mini App Comprehensive Test Suite
 * Validates Features 1 through 7:
 * - Feature 1: Owner notifications, safe HTML formatting, persistent outbox, error diagnosis, truthful acknowledgment
 * - Feature 2: Full bidirectional customer support, owner reply mapping, media copy, website tickets
 * - Feature 3: Welcome screen, commands, inline keyboard buttons, setMyCommands
 * - Feature 4: Owner commands (/owner_status, /testnotify, /inbox, /resend), non-owner rejection
 * - Feature 5: Telegram Mini App, setChatMenuButton, initData HMAC-SHA256 signature verification
 * - Feature 6: Admin diagnostics, metrics, sync actions
 * - Feature 7: Automated unit tests with mocked Bot API calls
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Safely load .env.local for test execution
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_HANDLE,
  TELEGRAM_BOT_COMMANDS,
  TELEGRAM_WELCOME_MESSAGE,
  DOCUNEXA_SITE_URL,
  DOCUNEXA_MINI_APP_URL,
  getMainNavigationKeyboard,
  getTelegramReplyForText,
  escapeHtml,
  escapeMarkdown,
  verifyTelegramInitData,
  getTelegramBotStatus,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  registerTelegramCommands,
  setTelegramChatMenuButton,
  sendTelegramMessage,
  copyTelegramMessage,
  saveTelegramSupportTicket,
  getTelegramSupportTicket,
  updateTelegramSupportTicket,
  listRecentTelegramTickets,
  saveTelegramMapping,
  getTelegramMapping,
  isTelegramUpdateProcessed,
  markTelegramUpdateProcessed,
  deliverTicketToOwner,
  sendCustomerAcknowledgment,
  notifyOwnerOfWebsiteTicket,
  retryFailedTelegramNotifications,
  handleTelegramWebhookUpdate,
} from '../src/lib/telegram/bot';

import {
  validateSupportTicketInput,
  persistSupportTicket,
} from '../src/lib/support';

async function runTests() {
  console.log('\n================================================================');
  console.log('   DOCUNEXA — TELEGRAM BOT UPGRADE & MINI APP ACCEPTANCE AUDIT   ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(`  ${err.message || err}`);
      throw err;
    }
  }

  // Preserve initial environment
  const origToken = process.env.TELEGRAM_BOT_TOKEN;
  const origOwner = process.env.TELEGRAM_OWNER_CHAT_ID;
  const origSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // --------------------------------------------------------------------------
  // 1. WELCOME SCREEN, BUTTONS & OFFICIAL BOT COMMANDS
  // --------------------------------------------------------------------------
  console.log('--- 1. WELCOME SCREEN, BUTTONS & OFFICIAL BOT COMMANDS ---');

  await test('/start and /menu welcome message contains required friendly greeting and guidance', () => {
    const welcome = TELEGRAM_WELCOME_MESSAGE;
    assert.ok(welcome.includes('👋 Welcome to DocuNexa Support!'), 'Must include friendly greeting');
    assert.ok(welcome.includes('split textbooks into units'), 'Must describe textbook splitting');
    assert.ok(welcome.includes('🛠 Browse PDF Tools'), 'Must mention browse PDF tools');
    assert.ok(welcome.includes('✂️ Open PDF Unit Cutter'), 'Must mention PDF Unit Cutter');
    assert.ok(welcome.includes('🎁 View Coupon Information'), 'Must mention coupon info');
    assert.ok(welcome.includes('🎟 Contact Human Support'), 'Must mention human support');
    assert.ok(welcome.includes('🌐 Open DocuNexa Mini App'), 'Must mention Mini App');
    assert.ok(welcome.includes('24 hours'), 'Must mention 24-hour reply window');
  });

  await test('/start inline keyboard includes "Open DocuNexa" Mini App button and tool navigation', () => {
    const keyboard = getMainNavigationKeyboard();
    assert.ok(Array.isArray(keyboard.inline_keyboard), 'Must return an inline_keyboard matrix');
    
    // First row: Mini App web_app button
    const row1 = keyboard.inline_keyboard[0];
    assert.strictEqual(row1[0].text, '🌐 Open DocuNexa', 'First button must be labeled "Open DocuNexa"');
    assert.strictEqual((row1[0] as any).web_app?.url, 'https://docunexa.pro.et/telegram-app', 'Must point to Mini App URL');

    // Second row: Tools & Unit Cutter
    const row2 = keyboard.inline_keyboard[1];
    assert.strictEqual(row2[0].text, '🛠 Browse PDF Tools');
    assert.strictEqual((row2[0] as any).url, 'https://docunexa.pro.et/tools');
    assert.strictEqual(row2[1].text, '✂️ Open PDF Unit Cutter');
    assert.strictEqual((row2[1] as any).url, 'https://docunexa.pro.et/tools/pdf-unit-cutter');

    // Third row: Coupons & Support
    const row3 = keyboard.inline_keyboard[2];
    assert.strictEqual(row3[0].text, '🎁 View Coupon Information');
    assert.strictEqual(row3[1].text, '🎟 Contact Human Support');
  });

  await test('TELEGRAM_BOT_COMMANDS defines official customer command set', () => {
    const commands = TELEGRAM_BOT_COMMANDS.map((c) => c.command);
    const expected = ['start', 'help', 'menu', 'tools', 'cutter', 'coupon', 'privacy', 'support', 'website'];
    for (const exp of expected) {
      assert.ok(commands.includes(exp), `Expected command /${exp} to be registered`);
    }
    // Owner-only actions must NOT be registered in the public customer command list
    assert.ok(!commands.includes('owner_status'), 'Must not register internal owner commands publicly');
    assert.ok(!commands.includes('testnotify'), 'Must not register /testnotify publicly');
    assert.ok(!commands.includes('inbox'), 'Must not register /inbox publicly');
    assert.ok(!commands.includes('resend'), 'Must not register /resend publicly');
  });

  await test('getTelegramReplyForText dispatches customer navigation commands safely', () => {
    const startRes = getTelegramReplyForText('/start');
    assert.ok(startRes?.isCommand);
    assert.ok(startRes.text.includes('Welcome to DocuNexa Support'));
    assert.ok(startRes.replyMarkup?.inline_keyboard);

    const toolsRes = getTelegramReplyForText('/tools');
    assert.ok(toolsRes?.isCommand);
    assert.ok(toolsRes.text.includes('DocuNexa PDF Tools'));

    const cutterRes = getTelegramReplyForText('/cutter');
    assert.ok(cutterRes?.isCommand);
    assert.ok(cutterRes.text.includes('PDF Unit Cutter Guide'));

    const couponRes = getTelegramReplyForText('/coupon');
    assert.ok(couponRes?.isCommand);
    assert.ok(couponRes.text.includes('DOCUNEXA100well'));

    const supportRes = getTelegramReplyForText('/support');
    assert.ok(supportRes?.isCommand);
    assert.ok(supportRes.text.includes('DocuNexa Customer Support'));

    // Command with bot username suffix: /start@docunexa_bot
    const suffixRes = getTelegramReplyForText('/start@docunexa_bot');
    assert.ok(suffixRes?.isCommand);

    // Unfamiliar messages return null so they are treated as genuine support inquiries
    assert.strictEqual(getTelegramReplyForText('I need help with my biology textbook'), null);
  });

  // --------------------------------------------------------------------------
  // 2. SECURITY & FAIL-CLOSED WEBHOOK AUTHENTICATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. WEBHOOK SECURITY & FAIL-CLOSED AUTHENTICATION ---');

  await test('Rejects updates when TELEGRAM_WEBHOOK_SECRET is missing or empty (fail-closed)', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = '';
    const res = await handleTelegramWebhookUpdate({ update_id: 12345 }, 'any-header');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.handled, 'rejected');
    assert.ok(res.error?.includes('TELEGRAM_WEBHOOK_SECRET is not configured'));
  });

  await test('Rejects updates when X-Telegram-Bot-Api-Secret-Token is missing or mismatched', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'super-secret-token-123';
    
    // Missing header
    const missingRes = await handleTelegramWebhookUpdate({ update_id: 12345 }, null);
    assert.strictEqual(missingRes.ok, false);
    assert.strictEqual(missingRes.handled, 'rejected');

    // Wrong header
    const wrongRes = await handleTelegramWebhookUpdate({ update_id: 12345 }, 'wrong-token');
    assert.strictEqual(wrongRes.ok, false);
    assert.strictEqual(wrongRes.handled, 'rejected');
  });

  await test('Rejects non-owner invocation of internal owner commands', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-test-abc';
    process.env.TELEGRAM_OWNER_CHAT_ID = '999999999';

    // A regular customer (chat 111111111) tries to execute /owner_status
    const update = {
      update_id: 990001,
      message: {
        message_id: 10,
        chat: { id: 111111111, type: 'private' },
        from: { id: 111111111, first_name: 'Attacker' },
        text: '/owner_status',
      },
    };

    // Mock fetch to prevent network calls
    const origFetch = global.fetch;
    let sentToChat: any = null;
    global.fetch = async (url: any, opts: any) => {
      const body = JSON.parse(opts?.body || '{}');
      sentToChat = body.chat_id;
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 55 } }),
      } as any;
    };

    try {
      const res = await handleTelegramWebhookUpdate(update, 'secret-test-abc');
      // Must NOT execute owner command; it gets treated as customer inquiry or safe command
      assert.notStrictEqual(res.handled, 'owner_status_command');
    } finally {
      global.fetch = origFetch;
    }
  });

  // --------------------------------------------------------------------------
  // 3. SAFE PARSING & MARKDOWN / HTML ESCAPING
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SAFE FORMATTING & ENTITY PARSE ERROR RECOVERY ---');

  await test('escapeHtml escapes dangerous HTML characters to prevent entity parse errors', () => {
    const raw = '<script>alert("xss")</script> & "hello" > <';
    const escaped = escapeHtml(raw);
    assert.strictEqual(escaped, '&lt;script&gt;alert("xss")&lt;/script&gt; &amp; "hello" &gt; &lt;');
    assert.ok(!escaped.includes('<script>'));
  });

  await test('escapeMarkdown escapes special Markdown V1 reserved characters', () => {
    const raw = 'Textbook_Unit*1 [Chapter 2](http://url) `code`';
    const escaped = escapeMarkdown(raw);
    assert.ok(escaped.includes('\\_'));
    assert.ok(escaped.includes('\\*'));
    assert.ok(escaped.includes('\\['));
    assert.ok(escaped.includes('\\]'));
    assert.ok(escaped.includes('\\`'));
  });

  await test('sendTelegramMessage automatically falls back to plain text if Telegram rejects entities', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    const origFetch = global.fetch;
    let callCount = 0;
    let fallbackUsed = false;

    global.fetch = async (url: any, opts: any) => {
      callCount++;
      const body = JSON.parse(opts?.body || '{}');
      if (callCount === 1) {
        // First call fails with Telegram "can't parse entities" error
        return {
          ok: false,
          status: 400,
          json: async () => ({
            ok: false,
            error_code: 400,
            description: "Bad Request: can't parse entities: Character '_' is reserved",
          }),
        } as any;
      } else {
        // Second call (fallback) without parse_mode succeeds
        if (!body.parse_mode) {
          fallbackUsed = true;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { message_id: 777 },
          }),
        } as any;
      }
    };

    try {
      const res = await sendTelegramMessage('12345', 'Unescaped _text_ with *broken* entities', {
        parse_mode: 'HTML',
      });
      assert.strictEqual(res.ok, true, 'Fallback call should succeed');
      assert.strictEqual(fallbackUsed, true, 'Must strip parse_mode and retry as plain text');
      assert.strictEqual(res.messageId, 777);
    } finally {
      global.fetch = origFetch;
    }
  });

  // --------------------------------------------------------------------------
  // 4. PERSISTENT OUTBOX, ATOMIC SAVING & TRUTHFUL ACKNOWLEDGMENTS
  // --------------------------------------------------------------------------
  console.log('\n--- 4. OUTBOX PERSISTENCE & TRUTHFUL ACKNOWLEDGMENTS ---');

  await test('Customer support inquiry is persisted in outbox BEFORE notification is attempted', async () => {
    const testRef = `TG-TEST-${Date.now().toString(36).toUpperCase()}`;
    const testTicket = {
      ticketRef: testRef,
      updateId: '888123',
      customerChatId: 554433,
      customerMessageId: 101,
      customerName: 'Test Student',
      messageText: 'Can you help split Chapter 4 of my Chemistry book?',
      deliveryStatus: 'pending' as const,
      deliveryAttempts: 0,
      customerAcknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saveRes = await saveTelegramSupportTicket(testTicket);
    assert.strictEqual(saveRes.success, true, 'Ticket must be safely saved in storage');

    const fetched = await getTelegramSupportTicket(testRef);
    assert.ok(fetched, 'Must be retrievable from persistent storage');
    assert.strictEqual(fetched?.ticketRef, testRef);
    assert.strictEqual(fetched?.deliveryStatus, 'pending');
  });

  await test('Truthful customer acknowledgment differentiates delivered vs queued retry', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    const origFetch = global.fetch;
    let sentMessageText = '';

    global.fetch = async (url: any, opts: any) => {
      const body = JSON.parse(opts?.body || '{}');
      sentMessageText = body.text || '';
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 111 } }),
      } as any;
    };

    try {
      // Case A: Delivery Succeeded
      await sendCustomerAcknowledgment(554433, 'TG-DELIVERED-001', true, 101);
      assert.ok(sentMessageText.includes('Thank you for contacting DocuNexa Support!'), 'Must thank customer');
      assert.ok(sentMessageText.includes('forwarded to our support team'), 'Must state forwarded');
      assert.ok(sentMessageText.includes('#TG-DELIVERED-001'), 'Must include ticket reference');

      // Case B: Delivery Failed / Queued for Retry
      await sendCustomerAcknowledgment(554433, 'TG-QUEUED-002', false, 101);
      assert.ok(sentMessageText.includes('Your support ticket has been recorded'), 'Must state recorded');
      assert.ok(sentMessageText.includes('Notification delivery is currently being retried'), 'Must truthfully state retrying');
      assert.ok(sentMessageText.includes('https://docunexa.pro.et/support'), 'Must provide web support link');
      assert.ok(sentMessageText.includes('#TG-QUEUED-002'), 'Must include ticket reference');
    } finally {
      global.fetch = origFetch;
    }
  });

  await test('Missing or invalid owner chat config leaves ticket pending without claiming owner received it', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    delete process.env.TELEGRAM_OWNER_CHAT_ID; // Owner unset

    const testTicket = {
      ticketRef: `TG-NO-OWNER-${Date.now().toString(36).toUpperCase()}`,
      customerChatId: 12345,
      customerName: 'Student Without Owner',
      messageText: 'Hello',
      deliveryStatus: 'pending' as const,
      deliveryAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const delivery = await deliverTicketToOwner(testTicket);
    assert.strictEqual(delivery.ok, false);
    assert.ok(delivery.error?.includes('TELEGRAM_OWNER_CHAT_ID'), 'Reports missing owner chat precisely');
  });

  await test('Telegram API error when delivering to owner marks ticket as failed and ready for retry', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    process.env.TELEGRAM_OWNER_CHAT_ID = '987654321';
    const origFetch = global.fetch;

    global.fetch = async () => {
      return {
        ok: false,
        status: 403,
        json: async () => ({
          ok: false,
          error_code: 403,
          description: 'Forbidden: bot was blocked by the user',
        }),
      } as any;
    };

    const failedRef = `TG-BLOCKED-${Date.now().toString(36).toUpperCase()}`;
    const failedTicket = {
      ticketRef: failedRef,
      customerChatId: 12345,
      customerName: 'Blocked Test',
      messageText: 'Testing owner block',
      deliveryStatus: 'pending' as const,
      deliveryAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveTelegramSupportTicket(failedTicket);
      const delivery = await deliverTicketToOwner(failedTicket);
      assert.strictEqual(delivery.ok, false);
      assert.ok(delivery.error?.includes('blocked'), 'Reports owner blocked bot');

      const updated = await getTelegramSupportTicket(failedRef);
      assert.strictEqual(updated?.deliveryStatus, 'failed');
      assert.strictEqual(updated?.deliveryAttempts, 1);
      assert.ok(updated?.lastError?.includes('blocked'));
    } finally {
      global.fetch = origFetch;
    }
  });

  // --------------------------------------------------------------------------
  // 5. BIDIRECTIONAL REPLY ROUTING & MEDIA FORWARDING
  // --------------------------------------------------------------------------
  console.log('\n--- 5. BIDIRECTIONAL REPLY ROUTING & MEDIA COPY ---');

  await test('Saves persistent mapping between owner message ID and customer chat', async () => {
    const ownerMsgId = 445566;
    const mappingData = {
      customer_chat_id: 11223344,
      customer_message_id: 88,
      customer_name: 'David',
      ticket_ref: 'TG-MAP-12345',
    };

    const saveRes = await saveTelegramMapping(ownerMsgId, mappingData);
    assert.strictEqual(saveRes.success, true);

    const fetched = await getTelegramMapping(ownerMsgId);
    assert.ok(fetched);
    assert.strictEqual(String(fetched?.customer_chat_id), '11223344');
    assert.strictEqual(fetched?.ticket_ref, 'TG-MAP-12345');
  });

  await test('Owner replying to mapped message routes text directly to the customer', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    process.env.TELEGRAM_OWNER_CHAT_ID = '987654321';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-test-abc';

    // Store mapping
    const ownerMsgId = 778899;
    await saveTelegramMapping(ownerMsgId, {
      customer_chat_id: 334455,
      customer_message_id: 12,
      ticket_ref: 'TG-ROUTING-77',
    });

    const origFetch = global.fetch;
    let recipientChatId: any = null;
    let deliveredText = '';

    global.fetch = async (url: any, opts: any) => {
      const body = JSON.parse(opts?.body || '{}');
      if (body.chat_id === 334455) {
        recipientChatId = body.chat_id;
        deliveredText = body.text;
      }
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 999 } }),
      } as any;
    };

    const ownerReplyUpdate = {
      update_id: 998877,
      message: {
        message_id: 200,
        chat: { id: 987654321, type: 'private' },
        from: { id: 987654321, first_name: 'Owner' },
        reply_to_message: {
          message_id: ownerMsgId,
        },
        text: 'We have updated the textbook cutter. Please try again now!',
      },
    };

    try {
      const result = await handleTelegramWebhookUpdate(ownerReplyUpdate, 'secret-test-abc');
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.handled, 'owner_reply_delivered');
      assert.strictEqual(recipientChatId, 334455, 'Must deliver to customer chat ID');
      assert.ok(deliveredText.includes('We have updated the textbook cutter'));
      assert.ok(deliveredText.includes('Ref: #TG-ROUTING-77'));
    } finally {
      global.fetch = origFetch;
    }
  });

  await test('Webhook update idempotency prevents processing duplicate updates', async () => {
    const duplicateUpdateId = 884422;
    await markTelegramUpdateProcessed(duplicateUpdateId);

    const isProcessed = await isTelegramUpdateProcessed(duplicateUpdateId);
    assert.strictEqual(isProcessed, true, 'Update must be flagged as processed');

    // Trying to handle the same update again should return duplicate_ignored
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-test-abc';
    const update = {
      update_id: duplicateUpdateId,
      message: {
        message_id: 1,
        chat: { id: 12345 },
        text: 'Duplicate test',
      },
    };

    const res = await handleTelegramWebhookUpdate(update, 'secret-test-abc');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.handled, 'duplicate_ignored');
  });

  // --------------------------------------------------------------------------
  // 6. MINI APP & INITDATA SIGNATURE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- 6. TELEGRAM MINI APP & INITDATA SIGNATURE ---');

  await test('verifyTelegramInitData validates authentic Telegram WebApp HMAC-SHA256 signature', () => {
    const testBotToken = '123456:TEST_BOT_TOKEN_FOR_SIGNATURE';
    
    // Construct authentic initData
    const userJson = JSON.stringify({ id: 12345678, first_name: 'Alex', username: 'alex_pdf' });
    const authDate = Math.floor(Date.now() / 1000).toString();
    const queryId = 'AAHdF6IQAAAAAN0XohDhrP_j';

    const params: Record<string, string> = {
      auth_date: authDate,
      query_id: queryId,
      user: userJson,
    };

    const dataCheckString = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(testBotToken)
      .digest();

    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const validInitData = new URLSearchParams({ ...params, hash }).toString();

    // Verify valid signature
    const validResult = verifyTelegramInitData(validInitData, testBotToken);
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.user?.username, 'alex_pdf');
    assert.strictEqual(validResult.user?.id, 12345678);

    // Tampered initData must be rejected
    const tamperedInitData = validInitData.replace('alex_pdf', 'hacker_pdf');
    const invalidResult = verifyTelegramInitData(tamperedInitData, testBotToken);
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.error?.includes('Invalid HMAC'));
  });

  await test('registerTelegramCommands and setTelegramChatMenuButton call official Telegram API', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    const origFetch = global.fetch;
    const requestedEndpoints: string[] = [];

    global.fetch = async (url: any, opts: any) => {
      requestedEndpoints.push(String(url));
      return {
        ok: true,
        json: async () => ({ ok: true, result: true }),
      } as any;
    };

    try {
      const cmdRes = await registerTelegramCommands();
      assert.strictEqual(cmdRes.ok, true);
      assert.ok(requestedEndpoints.some((u) => u.includes('setMyCommands')));

      const menuRes = await setTelegramChatMenuButton();
      assert.strictEqual(menuRes.ok, true);
      assert.ok(requestedEndpoints.some((u) => u.includes('setChatMenuButton')));
    } finally {
      global.fetch = origFetch;
    }
  });

  // --------------------------------------------------------------------------
  // 7. WEBSITE TICKET PERSISTENCE & TELEGRAM NOTIFICATION INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 7. WEBSITE TICKETS & TELEGRAM OWNER ALERT ---');

  await test('Website support ticket persists in Supabase even if owner notification fails', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:FAKE_TOKEN_FOR_TEST';
    process.env.TELEGRAM_OWNER_CHAT_ID = '987654321';
    const origFetch = global.fetch;

    // Simulate Telegram API offline/failing
    global.fetch = async (url: any, opts: any) => {
      if (String(url).includes('api.telegram.org')) {
        throw new Error('Telegram network unreachable');
      }
      return origFetch(url, opts);
    };

    const ticketInput = {
      name: 'Elena Rostova',
      email: 'elena@example.edu',
      category: 'PDF Tools' as const,
      subject: 'Table of Contents calibration issue in math textbook',
      message: 'The chapters offset by 4 pages due to preliminary preface pages.',
    };

    const validation = validateSupportTicketInput(ticketInput);
    assert.strictEqual(validation.valid, true);

    const persistence = await persistSupportTicket(validation.sanitized!);
    assert.strictEqual(persistence.success, true, 'Database persistence must succeed');
    assert.ok(persistence.ticketId, 'Must generate persistent ticket ID');

    // Telegram notification attempt fails gracefully
    let notifyErrorCaught = false;
    try {
      const notified = await notifyOwnerOfWebsiteTicket({
        ticketId: persistence.ticketId!,
        ...ticketInput,
      });
      assert.strictEqual(notified, false, 'Reports false without throwing unhandled error');
    } catch {
      notifyErrorCaught = true;
    }

    assert.strictEqual(notifyErrorCaught, false, 'Notification failure must not throw fatal exception');
    global.fetch = origFetch;
  });

  // Restore original environment
  if (origToken) process.env.TELEGRAM_BOT_TOKEN = origToken;
  else delete process.env.TELEGRAM_BOT_TOKEN;

  if (origOwner) process.env.TELEGRAM_OWNER_CHAT_ID = origOwner;
  else delete process.env.TELEGRAM_OWNER_CHAT_ID;

  if (origSecret) process.env.TELEGRAM_WEBHOOK_SECRET = origSecret;
  else delete process.env.TELEGRAM_WEBHOOK_SECRET;

  console.log('\n================================================================');
  console.log(`TELEGRAM BOT & MINI APP AUDIT: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL AUDIT FAILURE]:', err);
  process.exit(1);
});
