import { validateTelegramInitData, applySecurityHeadersAndValidation, escapeHtml } from './_telegram.js';

export default async function handler(req, res) {
  const security = applySecurityHeadersAndValidation(req, res, 1024 * 1024); // max 1MB
  if (!security) return;
  const { botToken } = security;

  try {
    const { salesAccount, targetChatIds, initData } = req.body || {};

    // Validate initData
    const auth = validateTelegramInitData(initData, botToken);
    if (!auth.valid) {
      return res.status(401).json({ ok: false, error: `Unauthorized Telegram Request: ${auth.error}` });
    }

    const serverSalesChatId = process.env.TELEGRAM_SALES_CHAT_ID || '1256184682';
    const cids = Array.isArray(targetChatIds) && targetChatIds.length > 0 ? targetChatIds : [serverSalesChatId];

    let sent = false;
    let lastErr = '';

    for (const cid of cids) {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(cid),
          text: `🔔 <b>TEST ALERT from INFO POS Hardware</b>\n━━━━━━━━━━━━━━━━━━━━\nSales Account: <b>@${(salesAccount || 'Skybalsupport').replace('@', '')}</b>\nStatus: 🟢 <b>Connected & Active</b>\n\nYour sales desk is linked! Customer orders with payment receipts and GPS locations will arrive here in real time.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve Payment', callback_data: 'verify:test' },
                { text: '❌ Reject Payment', callback_data: 'reject:test' },
              ],
            ],
          },
        }),
      });

      const data = await tgRes.json();
      if (data.ok) {
        sent = true;
      } else {
        lastErr = data.description;
      }
    }

    if (sent) {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(502).json({ ok: false, error: lastErr || 'Failed to send test alert to Telegram' });
    }
  } catch (err) {
    console.error('test-alert handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error sending test alert' });
  }
}
