import { validateTelegramInitData, applySecurityHeadersAndValidation, escapeHtml } from './_telegram.js';

function formatPaymentMethodName(pm) {
  switch (pm) {
    case 'khqr_aba':
      return '1: ABA Mobile (KHQR)';
    case 'khqr_bakong':
      return '2: Bakong KHQR (Universal)';
    case 'kb_prasac':
      return '3: KB Mobile / KB PRASAC KHQR';
    case 'cod':
      return 'Cash on Delivery (COD)';
    default:
      return pm || 'Standard Transfer';
  }
}

export default async function handler(req, res) {
  const security = applySecurityHeadersAndValidation(req, res, 15 * 1024 * 1024); // max 15MB
  if (!security) return;
  const { botToken } = security;

  try {
    const { order, settings, initData } = req.body || {};

    if (!order || typeof order !== 'object') {
      return res.status(400).json({ ok: false, error: 'Missing or invalid order payload' });
    }

    // Require and validate Telegram initData
    const auth = validateTelegramInitData(initData, botToken);
    if (!auth.valid) {
      return res.status(401).json({ ok: false, error: `Unauthorized Telegram Request: ${auth.error}` });
    }

    // Server-managed Sales Chat ID (env var with fallback to constant ID)
    const serverSalesChatId = process.env.TELEGRAM_SALES_CHAT_ID || '1256184682';
    const chatIds = [serverSalesChatId];

    if (settings?.salesTelegramChatId && /^\d+$/.test(String(settings.salesTelegramChatId).trim())) {
      const customId = String(settings.salesTelegramChatId).trim();
      if (!chatIds.includes(customId)) {
        chatIds.push(customId);
      }
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsList = items
      .map((item) => `• ${item.quantity}x ${escapeHtml(item.product?.name?.en || item.product?.name || 'Hardware Item')} ($${((item.product?.price || 0) * item.quantity).toFixed(2)})`)
      .join('\n');

    const customerTelegram = order.customer?.telegramUsername ? ` (${order.customer.telegramUsername})` : '';
    const gpsInfo = order.customer?.googleMapsUrl
      ? `\n🗺️ <b>GPS Map:</b> <a href="${escapeHtml(order.customer.googleMapsUrl)}">Open Google Maps</a>`
      : '';
    const deliveryInfo = order.deliveryMethod
      ? `🚚 <b>Delivery:</b> ${order.deliveryMethod} (${(order.deliveryFee || 0) > 0 ? `$${Number(order.deliveryFee).toFixed(2)}` : 'Free'})\n`
      : '';

    const captionText =
      `🔔 <b>NEW HARDWARE ORDER RECEIVED!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔖 <b>Order ID:</b> <code>${escapeHtml(order.orderNumber)}</code>\n` +
      `👤 <b>Customer:</b> ${escapeHtml(order.customer?.fullName || 'Customer')}${escapeHtml(customerTelegram)}\n` +
      `📱 <b>Phone:</b> <a href="tel:${escapeHtml(order.customer?.phoneNumber || '')}">${escapeHtml(order.customer?.phoneNumber || 'N/A')}</a>\n` +
      `${deliveryInfo}` +
      `📍 <b>Location:</b> ${escapeHtml(order.customer?.detailedAddress || 'Phnom Penh')}, ${escapeHtml(order.customer?.provinceOrCity || '')}${gpsInfo}\n` +
      `${order.customer?.orderNotes ? `📝 <b>Note:</b> ${escapeHtml(order.customer.orderNotes)}\n` : ''}` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 <b>Hardware Items:</b>\n${itemsList}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 <b>Subtotal:</b> $${Number(order.subtotal || 0).toFixed(2)}\n` +
      `🚚 <b>Delivery Fee:</b> ${(order.deliveryFee || 0) > 0 ? `$${Number(order.deliveryFee).toFixed(2)}` : 'Free'}\n` +
      `💰 <b>Total Amount:</b> <b>$${Number(order.totalAmount || 0).toFixed(2)} USD</b>\n` +
      `💳 <b>Payment:</b> ${formatPaymentMethodName(order.paymentMethod)}\n` +
      `⚡ <b>Status:</b> ⏳ <b>Pending Verification</b>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Approve & Verify Payment',
          callback_data: `verify:${order.orderNumber}:${order.telegramUserId || ''}`,
        },
        {
          text: '❌ Reject Payment',
          callback_data: `reject:${order.orderNumber}:${order.telegramUserId || ''}`,
        },
      ],
    ];
    if (order.customer?.googleMapsUrl) {
      inlineKeyboard.push([
        { text: '📍 Open Customer GPS in Google Maps', url: order.customer.googleMapsUrl },
      ]);
    }

    let anySuccess = false;
    let lastError = null;

    for (const chatId of chatIds) {
      try {
        // If payment proof photo is provided as data URL
        if (order.paymentProofUrl && typeof order.paymentProofUrl === 'string' && order.paymentProofUrl.startsWith('data:image/')) {
          const matches = order.paymentProofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const blob = new Blob([buffer], { type: mimeType });

            const formData = new FormData();
            formData.append('chat_id', String(chatId));
            formData.append('caption', captionText);
            formData.append('parse_mode', 'HTML');
            formData.append('photo', blob, 'receipt.jpg');
            formData.append('reply_markup', JSON.stringify({ inline_keyboard: inlineKeyboard }));

            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: formData,
            });
            const json = await tgRes.json();
            if (json.ok) {
              anySuccess = true;
              continue;
            } else {
              lastError = json.description;
            }
          }
        }

        // Text fallback
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: String(chatId),
            text: captionText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineKeyboard },
          }),
        });
        const json = await tgRes.json();
        if (json.ok) {
          anySuccess = true;
        } else {
          lastError = json.description;
          console.error('sendMessage failed for chat', chatId, json.description);
        }
      } catch (err) {
        lastError = String(err);
      }
    }

    if (anySuccess) {
      return res.status(200).json({ ok: true, success: true });
    } else {
      return res.status(502).json({ ok: false, error: lastError || 'Failed to dispatch Telegram order message' });
    }
  } catch (err) {
    console.error('send-order handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error processing order alert' });
  }
}
