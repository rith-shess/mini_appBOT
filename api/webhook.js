// Vercel Serverless Function — handles Telegram Bot Webhook
// URL: https://mini-app-bot-eight.vercel.app/api/webhook

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '8327064995:AAHIdx3LgCYa-6Iog7fSFpMpO10pNK-yoZo';
const MINI_APP_URL = 'https://mini-app-bot-eight.vercel.app/';
const SALES_CHAT_ID = '1256184682'; // @Skybalsupport

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text, extra = {}) {
  try {
    const body = {
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      ...extra,
    };
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`sendMessage error to ${chatId}:`, err);
    return { ok: false, error: String(err) };
  }
}


async function setMenuButton(chatId) {
  try {
    await fetch(`${TG_API}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        menu_button: {
          type: 'web_app',
          text: 'Shop',
          web_app: { url: MINI_APP_URL }
        }
      })
    });
  } catch (err) {
    console.error(`setChatMenuButton error to ${chatId}:`, err);
  }
}

async function answerCallback(callbackQueryId, text) {
  try {
    await fetch(`${TG_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
  } catch (err) {
    console.error('answerCallbackQuery error:', err);
  }
}

export default async function handler(req, res) {
  // Allow GET for simple health check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'INFO POS Telegram Bot Webhook Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let update = req.body;
    if (typeof update === 'string') {
      try {
        update = JSON.parse(update);
      } catch (e) {
        // Ignored
      }
    }

    if (!update) {
      return res.status(200).json({ ok: true, msg: 'Empty update received' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. /start command — Welcomes user with personalized greeting & [🛒 Shop Now]
    // ──────────────────────────────────────────────────────────────────────────
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';

      if (chatId && text.startsWith('/start')) {
        // Automatically enforce bottom-left menu button to "Shop" -> MINI_APP_URL
        setMenuButton(chatId).catch(() => {});
        const username = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || 'Customer');

        const welcomeMessage =
          `👋 Hello <b>${username}</b>!\n\n` +
          `Welcome to <b>INFO POS Hardware</b>. Here is our mini shop POS! 🛒\n\n` +
          `Browse our commercial-grade POS terminals, barcode scanners, receipt printers, and cash drawers with full warranty and fast delivery across Cambodia.\n\n` +
          `Tap below to explore our products!`;

        await sendMessage(chatId, welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🛒 Shop Now',
                  web_app: { url: MINI_APP_URL },
                },
              ],
            ],
          },
        });

        return res.status(200).json({ ok: true });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Callback Queries (Sales Approve / Reject Buttons)
    // ──────────────────────────────────────────────────────────────────────────
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const salesChatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const adminName = cb.from?.username ? `@${cb.from.username}` : (cb.from?.first_name || 'Sales Staff');

      if (data.startsWith('verify:')) {
        const payload = data.replace('verify:', '');
        const parts = payload.split(':');
        const orderNum = parts[0] || 'Order';
        const customerChatId = parts[1] || '';

        await answerCallback(cb.id, '✅ Payment Verified & Customer Alerted!');

        // Update inline buttons on the sales card
        if (salesChatId && messageId) {
          await fetch(`${TG_API}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: salesChatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [
                  [{ text: `✅ VERIFIED & APPROVED by ${adminName} (Customer Alerted)`, callback_data: 'noop' }],
                ],
              },
            }),
          });
        }

        // 🔔 Alert the customer directly in Telegram!
        if (customerChatId && customerChatId !== 'undefined' && customerChatId.trim()) {
          const customerMsg =
            `🎉 <b>PAYMENT CONFIRMED & APPROVED!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Dear Customer,\n\n` +
            `Your payment for Order <code>#${orderNum}</code> has been <b>VERIFIED & APPROVED</b> by the INFO POS Hardware sales desk! ✅\n\n` +
            `📦 Your POS hardware order is being packed and prepared for immediate dispatch.\n\n` +
            `📞 Hotline: +855 (0) 23 999 888 / @Skybalsupport\n\n` +
            `Thank you for shopping with INFO POS Hardware!`;

          await sendMessage(customerChatId, customerMsg, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🛒 Open Store',
                    web_app: { url: MINI_APP_URL },
                  },
                ],
              ],
            },
          });
        }
      } else if (data.startsWith('reject:')) {
        const payload = data.replace('reject:', '');
        const parts = payload.split(':');
        const orderNum = parts[0] || 'Order';
        const customerChatId = parts[1] || '';

        await answerCallback(cb.id, '❌ Order Payment Rejected');

        if (salesChatId && messageId) {
          await fetch(`${TG_API}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: salesChatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [
                  [{ text: `❌ REJECTED by ${adminName} (Customer Alerted)`, callback_data: 'noop' }],
                ],
              },
            }),
          });
        }

        // 🔔 Alert the customer of payment issue
        if (customerChatId && customerChatId !== 'undefined' && customerChatId.trim()) {
          const customerMsg =
            `⚠️ <b>PAYMENT VERIFICATION NOTICE</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Dear Customer,\n\n` +
            `Our sales desk reviewed Order <code>#${orderNum}</code>, but could <b>not verify</b> your payment transfer receipt. ❌\n\n` +
            `Please check your bank transfer details or contact our sales team directly at @Skybalsupport.`;

          await sendMessage(customerChatId, customerMsg);
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook execution error:', err);
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
