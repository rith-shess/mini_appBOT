import { validateTelegramInitData, applySecurityHeadersAndValidation, escapeHtml } from './_telegram.js';

export default async function handler(req, res) {
  const security = applySecurityHeadersAndValidation(req, res, 1024 * 1024); // max 1MB
  if (!security) return;
  const { botToken } = security;

  try {
    const { order, status, settings, initData } = req.body || {};

    if (!order || !status) {
      return res.status(400).json({ ok: false, error: 'Missing order or status payload' });
    }

    // Require and validate Telegram initData
    const auth = validateTelegramInitData(initData, botToken);
    if (!auth.valid) {
      return res.status(401).json({ ok: false, error: `Unauthorized Telegram Request: ${auth.error}` });
    }

    let targetChatId = order.telegramUserId;
    if (!targetChatId && order.customer?.telegramUsername) {
      const cleanUser = order.customer.telegramUsername.replace('@', '').toLowerCase();
      if (cleanUser === 'rithilysm' || cleanUser === 'rith_shees') targetChatId = '1275900952';
      if (cleanUser === 'skybalsupport') targetChatId = process.env.TELEGRAM_SALES_CHAT_ID || '1256184682';
    }

    if (!targetChatId) {
      return res.status(400).json({ ok: false, error: 'No recipient Telegram Chat ID available for this customer' });
    }

    const isApproval = status === 'verified';
    const miniAppUrl = 'https://mini-app-bot-eight.vercel.app/';
    const supportUser = (settings?.telegramSupportUser || 'Skybalsupport').replace('@', '');
    const phone = settings?.phoneNumber || '+855 (0) 23 999 888';

    let customerMessage = '';
    if (isApproval) {
      customerMessage =
        `🎉 <b>PAYMENT CONFIRMED & APPROVED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear <b>${escapeHtml(order.customer?.fullName || 'Customer')}</b>,\n\n` +
        `Your payment for Order <code>#${escapeHtml(order.orderNumber)}</code> ($${Number(order.totalAmount || 0).toFixed(2)} USD) has been <b>VERIFIED & APPROVED</b> by INFO POS Hardware! ✅\n\n` +
        `📦 Your hardware order is being prepared for immediate dispatch to:\n` +
        `📍 <i>${escapeHtml(order.customer?.detailedAddress || '')}, ${escapeHtml(order.customer?.provinceOrCity || '')}</i>\n\n` +
        `📞 Hotline: <b>${escapeHtml(phone)}</b>\n\n` +
        `Thank you for shopping with INFO POS Hardware!`;
    } else {
      customerMessage =
        `⚠️ <b>PAYMENT VERIFICATION NOTICE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear <b>${escapeHtml(order.customer?.fullName || 'Customer')}</b>,\n\n` +
        `Our sales team reviewed Order <code>#${escapeHtml(order.orderNumber)}</code> but could <b>not verify</b> your payment transfer receipt. ❌\n\n` +
        `Please contact our sales team directly at @${escapeHtml(supportUser)} or call <b>${escapeHtml(phone)}</b>.`;
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(targetChatId),
        text: customerMessage,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🛒 Open Store',
                web_app: { url: miniAppUrl },
              },
            ],
          ],
        },
      }),
    });

    const json = await tgRes.json();
    if (json.ok) {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(502).json({ ok: false, error: json.description || 'Failed to send customer notification' });
    }
  } catch (err) {
    console.error('send-customer-alert handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
