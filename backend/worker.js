/**
 * Cloudflare Worker for INFO POS Hardware - Telegram Sales Bot
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
    const SALES_CHAT_ID = env.TELEGRAM_SALES_CHAT_ID;

    // Helper for Telegram API call
    async function callTelegram(method, payload, isMultipart = false, formData = null) {
      if (!BOT_TOKEN) return null;
      const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
      let response;
      if (isMultipart && formData) {
        response = await fetch(tgUrl, { method: 'POST', body: formData });
      } else {
        response = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      return response.json();
    }

    // 1. Submit Order Endpoint
    if (request.method === 'POST' && url.pathname === '/api/orders') {
      try {
        const orderPayload = await request.json();
        const timestamp = new Date();
        const datePart = timestamp.toISOString().slice(2, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `POS-${datePart}-${randomPart}`;

        const order = {
          ...orderPayload,
          id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          orderNumber,
          createdAt: timestamp.toISOString(),
          paymentVerificationStatus: 'pending_verification',
        };

        // If Cloudflare KV is available, store it:
        if (env.ORDERS_KV) {
          await env.ORDERS_KV.put(order.id, JSON.stringify(order));
        }

        // Notify Sales Team in Telegram
        if (SALES_CHAT_ID) {
          const itemsList = order.items
            .map((item) => `• ${item.quantity}x ${item.product.name.en} ($${(item.product.price * item.quantity).toFixed(2)})`)
            .join('\n');

          const gpsInfo = order.customer.googleMapsUrl
            ? `\n🗺️ <b>GPS Pin:</b> <a href="${order.customer.googleMapsUrl}">Open Google Maps</a>`
            : '';

          const captionText =
            `🔔 <b>NEW HARDWARE ORDER!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔖 <b>Order ID:</b> <code>${order.orderNumber}</code>\n` +
            `👤 <b>Customer:</b> ${order.customer.fullName} ${order.customer.telegramUsername ? `(${order.customer.telegramUsername})` : ''}\n` +
            `📱 <b>Phone:</b> <a href="tel:${order.customer.phoneNumber}">${order.customer.phoneNumber}</a>\n` +
            `📍 <b>Delivery:</b> ${order.customer.detailedAddress}, ${order.customer.provinceOrCity}${gpsInfo}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🛒 <b>Items:</b>\n${itemsList}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 <b>Total:</b> <b>$${order.totalAmount.toFixed(2)} USD</b>\n` +
            `⚡ <b>Status:</b> ⏳ <b>Pending Verification</b>`;

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

          // If photo proof exists
          if (order.paymentProofUrl && order.paymentProofUrl.startsWith('data:image/')) {
            try {
              const matches = order.paymentProofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const binary = atob(matches[2]);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                const blob = new Blob([array], { type: mimeType });

                const form = new FormData();
                form.append('chat_id', SALES_CHAT_ID);
                form.append('caption', captionText);
                form.append('parse_mode', 'HTML');
                form.append('photo', blob, 'receipt.jpg');
                form.append('reply_markup', JSON.stringify({ inline_keyboard: inlineButtons }));

                await callTelegram('sendPhoto', {}, true, form);
              }
            } catch (e) {
              await callTelegram('sendMessage', {
                chat_id: SALES_CHAT_ID,
                text: captionText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: inlineButtons },
              });
            }
          } else {
            await callTelegram('sendMessage', {
              chat_id: SALES_CHAT_ID,
              text: captionText,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: inlineButtons },
            });
          }
        }

        return new Response(JSON.stringify(order), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Telegram Webhook Endpoint
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        if (update.callback_query) {
          const cq = update.callback_query;
          const data = cq.data || '';
          const salesName = cq.from.username ? `@${cq.from.username}` : `${cq.from.first_name || 'Sales Staff'}`;

          if (data.startsWith('verify:') || data.startsWith('reject:')) {
            const [action, orderId] = data.split(':');
            const isApproval = action === 'verify';

            let order = null;
            if (env.ORDERS_KV) {
              const raw = await env.ORDERS_KV.get(orderId);
              if (raw) order = JSON.parse(raw);
            }

            // Answer Telegram button click
            await callTelegram('answerCallbackQuery', {
              callback_query_id: cq.id,
              text: isApproval ? 'Order Approved!' : 'Order Rejected!',
            });

            // Update Sales Message
            const statusEmoji = isApproval ? '✅' : '❌';
            const statusLabel = isApproval ? 'VERIFIED & APPROVED' : 'REJECTED';
            const updatedLine = `\n━━━━━━━━━━━━━━━━━━━━\n⚡ <b>Status:</b> ${statusEmoji} <b>${statusLabel}</b>\n👤 <b>Handled by:</b> ${salesName}`;

            const messageId = cq.message?.message_id;
            const chatId = cq.message?.chat?.id;

            if (messageId && chatId) {
              if (cq.message.caption) {
                const newCaption = cq.message.caption.replace(/⚡ Status:.*$/s, '').trim() + updatedLine;
                await callTelegram('editMessageCaption', {
                  chat_id: chatId,
                  message_id: messageId,
                  caption: newCaption,
                  parse_mode: 'HTML',
                });
              } else if (cq.message.text) {
                const newText = cq.message.text.replace(/⚡ Status:.*$/s, '').trim() + updatedLine;
                await callTelegram('editMessageText', {
                  chat_id: chatId,
                  message_id: messageId,
                  text: newText,
                  parse_mode: 'HTML',
                });
              }
            }

            // Alert the Customer in Telegram!
            if (order && order.telegramUserId) {
              let customerMessage = '';
              if (isApproval) {
                customerMessage =
                  `🎉 <b>PAYMENT CONFIRMED!</b>\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `Dear <b>${order.customer.fullName}</b>,\n\n` +
                  `Your payment for Order <code>#${order.orderNumber}</code> has been <b>VERIFIED & APPROVED</b> by our sales team! ✅\n\n` +
                  `📦 Your POS hardware is being prepared for delivery to:\n` +
                  `📍 <i>${order.customer.detailedAddress}, ${order.customer.provinceOrCity}</i>\n\n` +
                  `📞 Hotline: <b>+855 (0) 23 999 888</b>\n` +
                  `Thank you for choosing <b>INFO POS Hardware</b>!`;
              } else {
                customerMessage =
                  `⚠️ <b>PAYMENT VERIFICATION NOTICE</b>\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `Dear <b>${order.customer.fullName}</b>,\n\n` +
                  `Our sales team could not verify your payment screenshot for Order <code>#${order.orderNumber}</code>. ❌\n\n` +
                  `Please contact our sales desk directly at @InfoPOSMini_StoreBot.`;
              }

              await callTelegram('sendMessage', {
                chat_id: order.telegramUserId,
                text: customerMessage,
                parse_mode: 'HTML',
              });
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ status: 'online', service: 'INFO POS Cloudflare Worker' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
