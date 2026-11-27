import { validateTelegramInitData, applySecurityHeadersAndValidation, escapeHtml } from './_telegram.js';

export default async function handler(req, res) {
  const security = applySecurityHeadersAndValidation(req, res, 15 * 1024 * 1024); // max 15MB
  if (!security) return;
  const { botToken } = security;

  try {
    const { chatId, caption, photoBase64, mimeType, replyMarkup, initData } = req.body || {};

    if (!chatId || !photoBase64) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: chatId and photoBase64' });
    }

    // Require and validate Telegram initData
    const auth = validateTelegramInitData(initData, botToken);
    if (!auth.valid) {
      return res.status(401).json({ ok: false, error: `Unauthorized Telegram Request: ${auth.error}` });
    }

    const cleanBase64 = photoBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });

    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('photo', blob, 'photo.jpg');
    if (caption) {
      formData.append('caption', String(caption));
      formData.append('parse_mode', 'HTML');
    }
    if (replyMarkup) {
      formData.append('reply_markup', typeof replyMarkup === 'string' ? replyMarkup : JSON.stringify(replyMarkup));
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const json = await tgRes.json();

    if (json.ok) {
      return res.status(200).json({ ok: true, result: json.result });
    } else {
      return res.status(502).json({ ok: false, error: json.description || 'Telegram sendPhoto failed' });
    }
  } catch (err) {
    console.error('send-photo handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error sending photo' });
  }
}
