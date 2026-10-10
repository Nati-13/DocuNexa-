/**
 * DocuNexa — Telegram Bot Public Constants and Knowledge Base
 * Client-safe (no server dependencies, no secrets)
 */

export const TELEGRAM_BOT_USERNAME = 'docunexa_bot';
export const TELEGRAM_BOT_HANDLE = '@docunexa_bot';
export const TELEGRAM_BOT_URL = 'https://t.me/docunexa_bot';

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

• Upload your textbook PDF.
• Review detected units with calibrated printed-to-physical page offsets.
• Select the exact units you need.
• Download high-speed extracted slices with 100% privacy!

🔗 Flagship Tool: https://docunexa.pro.et/tools/pdf-unit-cutter`,

  coupon: `🏷️ *Coupons & Discounts:*
DocuNexa provides promotional coupon codes for Ad-Free upgrades.

• Enter your coupon on the plan checkout screen.
• Valid discounts (including 100% complimentary codes like DOCUNEXA100well) apply immediately before confirmation.
• Manage or activate at: https://docunexa.pro.et/choose-plan`,

  privacy: `🔒 *Privacy & Client-Side Architecture:*
Unlike other PDF websites, DocuNexa processes your document operations directly inside your web browser. Your files are NOT stored on remote servers.

🛡️ Security Architecture: https://docunexa.pro.et/security`,

  support: `📩 *DocuNexa Customer Support:*
If you need personal assistance with account issues, payments, bug reports, or tool feedback:

• 💬 Telegram: Chat with us right here on @docunexa_bot
• 🌐 Web Support Form: https://docunexa.pro.et/support
• 📧 Maintainer Email: natanemyalew10@gmail.com`,
};

/**
 * Dispatches an automated response to a Telegram text message
 */
export function getTelegramReplyForText(rawText: string): string {
  const text = (rawText || '').trim().toLowerCase();

  if (text.startsWith('/start') || text === 'hi' || text === 'hello') {
    return `👋 *Welcome to DocuNexa Support (@docunexa_bot)!*

DocuNexa is your private, client-side PDF workspace featuring the flagship *PDF Unit Cutter* and 34+ free document utilities.

*How can we help you today?*
• /tools - Browse all 34 PDF tools
• /cutter - How to use the PDF Unit Cutter
• /coupon - How to apply promotional discount codes
• /privacy - Learn about our browser-first privacy
• /support - Open a ticket with our support team

You can also send your question or screenshot directly here. Our support team normally replies within 24 hours!

🌐 Website: https://docunexa.pro.et
📩 Web Support: https://docunexa.pro.et/support`;
  }

  if (text.startsWith('/tools')) {
    return TELEGRAM_FAQ_TOPICS.tools;
  }

  if (text.startsWith('/cutter') || text.includes('unit cutter') || text.includes('textbook')) {
    return TELEGRAM_FAQ_TOPICS.unitcutter;
  }

  if (text.startsWith('/coupon') || text.includes('discount') || text.includes('promo')) {
    return TELEGRAM_FAQ_TOPICS.coupon;
  }

  if (text.startsWith('/privacy') || text.includes('security') || text.includes('safe')) {
    return TELEGRAM_FAQ_TOPICS.privacy;
  }

  if (text.startsWith('/support') || text.startsWith('/help') || text.includes('help') || text.includes('contact')) {
    return TELEGRAM_FAQ_TOPICS.support;
  }

  return '';
}
