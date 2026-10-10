/**
 * DocuNexa — Telegram Bot Public Constants and Knowledge Base
 * Client-safe (no server dependencies, no secrets)
 */

export const TELEGRAM_BOT_USERNAME = 'docunexa_bot';
export const TELEGRAM_BOT_HANDLE = '@docunexa_bot';
export const TELEGRAM_BOT_URL = 'https://t.me/docunexa_bot';
export const DOCUNEXA_SITE_URL = 'https://docunexa.pro.et';
export const DOCUNEXA_MINI_APP_URL = 'https://docunexa.pro.et/telegram-app';

export interface TelegramBotStatus {
  username: string;
  handle: string;
  url: string;
  configured: boolean;
  ownerConfigured: boolean;
  webhookSecretConfigured: boolean;
  message: string;
}

/**
 * Standard Customer Command Definitions registered via official setMyCommands
 */
export const TELEGRAM_BOT_COMMANDS = [
  { command: 'start', description: 'Welcome and main menu' },
  { command: 'help', description: 'Help and frequently asked questions' },
  { command: 'menu', description: 'Open the navigation menu' },
  { command: 'tools', description: 'Browse all PDF tools' },
  { command: 'cutter', description: 'Help with PDF Unit Cutter' },
  { command: 'coupon', description: 'Explain how to apply a coupon' },
  { command: 'privacy', description: 'Explain DocuNexa privacy approach' },
  { command: 'support', description: 'Contact the support team' },
  { command: 'website', description: 'Open the DocuNexa website' },
];

/**
 * Official Welcome Message Text
 */
export const TELEGRAM_WELCOME_MESSAGE = `👋 Welcome to DocuNexa Support!
Your PDF workspace helps you split textbooks into units, merge and convert documents, and use our other PDF tools.

What would you like to do today?
🛠 Browse PDF Tools
✂️ Open PDF Unit Cutter
🎁 View Coupon Information
🎟 Contact Human Support
🌐 Open DocuNexa Mini App

For personal assistance, send your message here. Our team normally replies within 24 hours.`;

/**
 * Reusable Telegram Inline Navigation Keyboard
 */
export function getMainNavigationKeyboard(
  siteUrl = DOCUNEXA_SITE_URL,
  miniAppUrl = DOCUNEXA_MINI_APP_URL
) {
  return {
    inline_keyboard: [
      [
        { text: '🌐 Open DocuNexa', web_app: { url: miniAppUrl } },
      ],
      [
        { text: '🛠 Browse PDF Tools', url: `${siteUrl}/tools` },
        { text: '✂️ Open PDF Unit Cutter', url: `${siteUrl}/tools/pdf-unit-cutter` },
      ],
      [
        { text: '🎁 View Coupon Information', url: `${siteUrl}/choose-plan` },
        { text: '🎟 Contact Human Support', url: `${siteUrl}/support` },
      ],
    ],
  };
}

/**
 * Knowledge base answers for automated Telegram help & FAQs
 */
export const TELEGRAM_FAQ_TOPICS: Record<string, string> = {
  tools: `🛠️ *DocuNexa PDF Tools (34+ Available):*
• *PDF Unit Cutter:* Split academic textbooks into discrete syllabus units with automatic TOC detection.
• *Merge PDF:* Combine multiple PDF documents into one.
• *Split PDF:* Separate PDF by custom page ranges.
• *Compress PDF:* Reduce document size locally in browser.
• *PDF to Word / Excel / JPG:* Convert documents safely.

🌐 Explore all tools: https://docunexa.pro.et/tools`,

  unitcutter: `✂️ *PDF Unit Cutter Guide:*
DocuNexa PDF Unit Cutter uses client-side pattern recognition to detect textbook chapters and units from the Table of Contents or body headers.

1. Upload your textbook PDF.
2. Review detected units with calibrated printed-to-physical page offsets.
3. Select the exact units you need.
4. Download high-speed extracted slices with 100% privacy!

🔗 Flagship Tool: https://docunexa.pro.et/tools/pdf-unit-cutter`,

  coupon: `🏷️ *Coupons & Discounts:*
DocuNexa provides promotional coupon codes for Ad-Free upgrades.

• Enter your coupon on the plan checkout screen.
• Active 100% complimentary coupon: \`DOCUNEXA100well\` gives 100% off ad-free access!
• Activate at: https://docunexa.pro.et/choose-plan`,

  privacy: `🔒 *Privacy & Client-Side Architecture:*
Unlike other PDF websites, DocuNexa processes your document operations directly inside your web browser. Your files are NOT stored on remote servers.

🛡️ Security Architecture: https://docunexa.pro.et/security`,

  support: `📩 *DocuNexa Customer Support:*
If you need personal assistance with account issues, payments, bug reports, or tool feedback:

• 💬 Telegram: Send your message right here in this chat!
• 🌐 Web Support Form: https://docunexa.pro.et/support
• 📧 Maintainer Email: natanemyalew10@gmail.com`,

  help: `💡 *DocuNexa Telegram Bot Help & Commands:*
• /start - Welcome message and main menu
• /menu - Interactive buttons for tools & Mini App
• /tools - Full list of 34+ browser-based PDF utilities
• /cutter - Guide for the flagship PDF Unit Cutter
• /coupon - 100% off coupon code & redemption guide
• /privacy - Client-side zero-storage privacy overview
• /support - How to reach our human support team
• /website - Open the official DocuNexa website

💬 To talk to human support, simply type your question or send a screenshot here. Our team normally reviews and replies within 24 hours.`,
};

/**
 * Dispatches an automated response to a customer command
 */
export function getTelegramReplyForText(rawText: string): {
  text: string;
  replyMarkup?: any;
  isCommand: boolean;
} | null {
  const clean = (rawText || '').trim();
  if (!clean.startsWith('/')) {
    // Check if greeting
    const lower = clean.toLowerCase();
    if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
      return {
        text: TELEGRAM_WELCOME_MESSAGE,
        replyMarkup: getMainNavigationKeyboard(),
        isCommand: true,
      };
    }
    return null; // Regular message, treat as support inquiry
  }

  // Extract base command ignoring @docunexa_bot suffix and extra arguments
  const firstWord = clean.split(/\s+/)[0].toLowerCase();
  const command = firstWord.replace(/@docunexa_bot$/, '').slice(1);

  switch (command) {
    case 'start':
    case 'menu':
      return {
        text: TELEGRAM_WELCOME_MESSAGE,
        replyMarkup: getMainNavigationKeyboard(),
        isCommand: true,
      };

    case 'tools':
      return {
        text: TELEGRAM_FAQ_TOPICS.tools,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🛠️ Open All PDF Tools', url: `${DOCUNEXA_SITE_URL}/tools` }],
            [{ text: '✂️ PDF Unit Cutter', url: `${DOCUNEXA_SITE_URL}/tools/pdf-unit-cutter` }],
          ],
        },
        isCommand: true,
      };

    case 'cutter':
      return {
        text: TELEGRAM_FAQ_TOPICS.unitcutter,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '✂️ Launch PDF Unit Cutter', url: `${DOCUNEXA_SITE_URL}/tools/pdf-unit-cutter` }],
          ],
        },
        isCommand: true,
      };

    case 'coupon':
      return {
        text: TELEGRAM_FAQ_TOPICS.coupon,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🎁 Redeem DOCUNEXA100well', url: `${DOCUNEXA_SITE_URL}/choose-plan` }],
          ],
        },
        isCommand: true,
      };

    case 'privacy':
      return {
        text: TELEGRAM_FAQ_TOPICS.privacy,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔒 Privacy & Security Architecture', url: `${DOCUNEXA_SITE_URL}/security` }],
          ],
        },
        isCommand: true,
      };

    case 'help':
    case 'faq':
      return {
        text: TELEGRAM_FAQ_TOPICS.help,
        replyMarkup: getMainNavigationKeyboard(),
        isCommand: true,
      };

    case 'support':
      return {
        text: TELEGRAM_FAQ_TOPICS.support,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🎟️ Web Support Form', url: `${DOCUNEXA_SITE_URL}/support` }],
          ],
        },
        isCommand: true,
      };

    case 'website':
      return {
        text: `🌐 *DocuNexa Official Website:*\nVisit our fast, private, client-side PDF workspace at ${DOCUNEXA_SITE_URL}`,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🌐 Visit DocuNexa', url: DOCUNEXA_SITE_URL }],
            [{ text: '📱 Open Telegram Mini App', web_app: { url: DOCUNEXA_MINI_APP_URL } }],
          ],
        },
        isCommand: true,
      };

    default:
      // Unknown command starting with / -> Treat as support inquiry or give helpful guide
      return null;
  }
}
