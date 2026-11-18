/**
 * INFO POS Hardware - Telegram Sales Bot Backend Server
 * 
 * Flow:
 * 1. Customer places order in Mini App -> POST /api/orders
 * 2. Backend alerts Sales team in Telegram with order details + payment screenshot + [Approve] / [Reject] buttons
 * 3. Sales clicks [Approve] or [Reject] in Telegram -> Telegram sends callback_query to /webhook
 * 4. Backend updates order status & immediately alerts the customer in Telegram!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SALES_CHAT_ID = process.env.TELEGRAM_SALES_CHAT_ID || '@Skybalsupport';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Simple in-memory & JSON file storage for orders
const DB_FILE = path.join(__dirname, 'orders.json');
let ordersDB = {};

try {
  if (fs.existsSync(DB_FILE)) {
    ordersDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }
} catch (e) {
  ordersDB = {};
}

function saveOrdersDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(ordersDB, null, 2));
  } catch (e) {
    console.error('Failed saving orders DB:', e);
  }
}

// Telegram Bot API Helper
async function callTelegram(method, payload, isMultipart = false, formData = null) {
  if (!BOT_TOKEN) {
    console.warn(`[Telegram Bot] No TELEGRAM_BOT_TOKEN set. Skipping call to ${method}`);
    return null;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  try {
    let response;
    if (isMultipart && formData) {
      response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    const result = await response.json();
    if (!result.ok) {
      console.error(`[Telegram Bot API Error] ${method}:`, result.description);
    }
    return result;
  } catch (err) {
    console.error(`[Telegram Bot Network Error] ${method}:`, err.message);
    return null;
  }
}

/**
 * Send order alert to the Sales Team Chat in Telegram
 */
async function notifySalesTeam(order) {
  if (!SALES_CHAT_ID) {
    console.warn('[Telegram Bot] No TELEGRAM_SALES_CHAT_ID configured. Order saved without Telegram notification.');
    return;
  }

  const itemsList = order.items
    .map((item) => `• ${item.quantity}x ${item.product.name.en} ($${(item.product.price * item.quantity).toFixed(2)})`)
    .join('\n');

  const customerTelegram = order.customer.telegramUsername ? ` (${order.customer.telegramUsername})` : '';
  const gpsInfo = order.customer.googleMapsUrl
    ? `\n🗺️ <b>GPS Pin:</b> <a href="${order.customer.googleMapsUrl}">Open Google Maps</a>`
    : '';

  const captionText =
    `🔔 <b>NEW HARDWARE ORDER!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔖 <b>Order ID:</b> <code>${order.orderNumber}</code>\n` +
    `👤 <b>Customer:</b> ${order.customer.fullName}${customerTelegram}\n` +
    `📱 <b>Phone:</b> <a href="tel:${order.customer.phoneNumber}">${order.customer.phoneNumber}</a>\n` +
    `📍 <b>Delivery:</b> ${order.customer.detailedAddress}, ${order.customer.provinceOrCity}${gpsInfo}\n` +
    `${order.customer.orderNotes ? `📝 <b>Notes:</b> ${order.customer.orderNotes}\n` : ''}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 <b>Ordered Items:</b>\n${itemsList}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 <b>Total Amount:</b> <b>$${order.totalAmount.toFixed(2)} USD</b>\n` +
    `💳 <b>Payment:</b> ${order.paymentMethod.toUpperCase().replace('_', ' ')}\n` +
    `⚡ <b>Status:</b> ⏳ <b>Pending Verification</b>`;

  // Inline buttons for Sales action
  const inlineButtons = [
    [
      { text: '✅ Approve & Verify Payment', callback_data: `verify:${order.id}` },
      { text: '❌ Reject Payment', callback_data: `reject:${order.id}` },
    ],
  ];

  if (order.customer.googleMapsUrl) {
    inlineButtons.push([
      { text: '📍 Open Customer GPS in Google Maps', url: order.customer.googleMapsUrl },
    ]);
  }

  // If customer uploaded a payment proof screenshot
  if (order.paymentProofUrl && order.paymentProofUrl.startsWith('data:image/')) {
    try {
      // Extract base64 and create a Blob to send via multipart
      const matches = order.paymentProofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        const form = new FormData();
        form.append('chat_id', SALES_CHAT_ID);
        form.append('caption', captionText);
        form.append('parse_mode', 'HTML');
        form.append('photo', blob, 'payment_proof.jpg');
        form.append('reply_markup', JSON.stringify({ inline_keyboard: inlineButtons }));

        const res = await callTelegram('sendPhoto', {}, true, form);
        if (res && res.ok) {
          order.telegramSalesMessageId = res.result.message_id;
          saveOrdersDB();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed sending payment proof as photo, falling back to message:', e);
    }
  }

  // Fallback: send text message
  const res = await callTelegram('sendMessage', {
    chat_id: SALES_CHAT_ID,
    text: captionText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineButtons },
  });

  if (res && res.ok) {
    order.telegramSalesMessageId = res.result.message_id;
    saveOrdersDB();
  }
}

/**
 * Handle Webhook Callback from Telegram when Sales clicks [Approve] or [Reject]
 */
async function handleTelegramWebhook(update) {
  // We care about callback_query
  if (!update.callback_query) return;

  const cq = update.callback_query;
  const data = cq.data; // e.g. "verify:ord_123" or "reject:ord_123"
  const salesUser = cq.from;
  const salesName = salesUser.username ? `@${salesUser.username}` : `${salesUser.first_name || 'Sales Staff'}`;

  if (!data || (!data.startsWith('verify:') && !data.startsWith('reject:'))) {
    return;
  }

  const [action, orderId] = data.split(':');
  const order = ordersDB[orderId];

  if (!order) {
    await callTelegram('answerCallbackQuery', {
      callback_query_id: cq.id,
      text: 'Order not found or expired.',
      show_alert: true,
    });
    return;
  }

  const isApproval = action === 'verify';
  order.paymentVerificationStatus = isApproval ? 'verified' : 'rejected';
  order.verifiedBy = salesName;
  order.verifiedAt = new Date().toISOString();
  saveOrdersDB();

  // 1. Answer callback immediately
  await callTelegram('answerCallbackQuery', {
    callback_query_id: cq.id,
    text: isApproval ? `Order ${order.orderNumber} Approved!` : `Order ${order.orderNumber} Rejected!`,
  });

  // 2. Update the message in Sales Chat so everyone knows it was handled
  const statusEmoji = isApproval ? '✅' : '❌';
  const statusLabel = isApproval ? 'VERIFIED & APPROVED' : 'REJECTED';
  const updatedStatusLine = `\n━━━━━━━━━━━━━━━━━━━━\n⚡ <b>Status:</b> ${statusEmoji} <b>${statusLabel}</b>\n👤 <b>Handled by:</b> ${salesName}\n🕒 <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`;

  const messageId = cq.message?.message_id;
  const chatId = cq.message?.chat?.id;

  if (messageId && chatId) {
    if (cq.message.caption) {
      const newCaption = cq.message.caption.replace(/⚡ Status:.*$/s, '').trim() + updatedStatusLine;
      await callTelegram('editMessageCaption', {
        chat_id: chatId,
        message_id: messageId,
        caption: newCaption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: order.customer.googleMapsUrl
            ? [[{ text: '📍 Open Customer GPS in Google Maps', url: order.customer.googleMapsUrl }]]
            : [],
        },
      });
    } else if (cq.message.text) {
      const newText = cq.message.text.replace(/⚡ Status:.*$/s, '').trim() + updatedStatusLine;
      await callTelegram('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: order.customer.googleMapsUrl
            ? [[{ text: '📍 Open Customer GPS in Google Maps', url: order.customer.googleMapsUrl }]]
            : [],
        },
      });
    }
  }

  // 3. ALERT THE CUSTOMER IN TELEGRAM!
  if (order.telegramUserId) {
    let customerMessage = '';
    if (isApproval) {
      customerMessage =
        `🎉 <b>PAYMENT CONFIRMED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear <b>${order.customer.fullName}</b>,\n\n` +
        `Great news! Your payment for Order <code>#${order.orderNumber}</code> ($${order.totalAmount.toFixed(2)} USD) has been <b>VERIFIED & CONFIRMED</b> by our sales team! ✅\n\n` +
        `📦 <b>Next Step:</b> Your hardware order is now packed and queued for immediate delivery to:\n` +
        `📍 <i>${order.customer.detailedAddress}, ${order.customer.provinceOrCity}</i>\n\n` +
        `📞 Need urgent assistance? Call our hotline: <b>+855 (0) 23 999 888</b>\n\n` +
        `Thank you for trusting <b>INFO POS Hardware</b>!`;
    } else {
      customerMessage =
        `⚠️ <b>PAYMENT VERIFICATION NOTICE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear <b>${order.customer.fullName}</b>,\n\n` +
        `Our sales team reviewed your payment receipt for Order <code>#${order.orderNumber}</code>, but could <b>not verify</b> the transfer. ❌\n\n` +
        `Please reach out to our sales desk on Telegram with your transfer transaction ID or receipt:\n` +
        `👉 Contact: @InfoPOSMini_StoreBot\n` +
        `📞 Phone: +855 (0) 23 999 888`;
    }

    await callTelegram('sendMessage', {
      chat_id: order.telegramUserId,
      text: customerMessage,
      parse_mode: 'HTML',
    });
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Submit Order Endpoint
  if (req.method === 'POST' && url.pathname === '/api/orders') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const orderPayload = JSON.parse(body);

        const timestamp = new Date();
        const datePart = timestamp.toISOString().slice(2, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const generatedOrderNumber = `POS-${datePart}-${randomPart}`;

        const order = {
          ...orderPayload,
          id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          orderNumber: generatedOrderNumber,
          createdAt: timestamp.toISOString(),
          paymentVerificationStatus: 'pending_verification',
        };

        ordersDB[order.id] = order;
        saveOrdersDB();

        // Trigger asynchronous Telegram Sales Notification
        notifySalesTeam(order).catch((err) => console.error('Notification error:', err));

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(order));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2. Telegram Webhook Endpoint
  if (req.method === 'POST' && url.pathname === '/webhook') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        await handleTelegramWebhook(update);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('Webhook error:', err);
        res.writeHead(200);
        res.end('ok');
      }
    });
    return;
  }

  // 3. Set Webhook Helper Endpoint
  if (req.method === 'POST' && url.pathname === '/api/set-webhook') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { webhookUrl } = JSON.parse(body);
        const result = await callTelegram('setWebhook', { url: webhookUrl });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Health Check
  if (url.pathname === '/api/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'INFO POS Hardware Telegram Bot Backend',
        botConnected: Boolean(BOT_TOKEN),
        salesChatConfigured: Boolean(SALES_CHAT_ID),
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`INFO POS Hardware Bot Server running on http://localhost:${PORT}`);
  console.log(`Telegram Bot Token: ${BOT_TOKEN ? 'CONFIGURED' : 'NOT SET'}`);
  console.log(`Sales Chat ID: ${SALES_CHAT_ID ? SALES_CHAT_ID : 'NOT SET'}`);
});
