// Vercel Serverless Function — handles Telegram Bot Webhook
// URL: https://mini-app-bot-eight.vercel.app/api/webhook

const BOT_TOKEN = '8327064995:AAFA7n4JkAUYzOv3I7evyQtVFTNYYwe_Aug';
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
        const orderId = data.replace('verify:', '');
        await answerCallback(cb.id, '✅ Payment Verified & Order Approved!');

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
                  [{ text: `✅ VERIFIED & APPROVED by ${adminName}`, callback_data: 'noop' }],
                ],
              },
            }),
          });
        }
      } else if (data.startsWith('reject:')) {
        const orderId = data.replace('reject:', '');
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
                  [{ text: `❌ REJECTED by ${adminName}`, callback_data: 'noop' }],
                ],
              },
            }),
          });
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
