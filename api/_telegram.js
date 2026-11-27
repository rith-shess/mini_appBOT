import crypto from 'crypto';

// In-memory rate limiting map: ip -> [timestamp, ...]
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

// Purge old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256 according to official Telegram docs:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
function validateTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    return { valid: false, error: 'Missing or invalid initData string' };
  }
  if (!botToken) {
    return { valid: false, error: 'Server misconfiguration: bot token not available' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { valid: false, error: 'Missing hash parameter in initData' };
    }
    params.delete('hash');

    // Check expiration: auth_date must not be older than 24 hours (86400 seconds)
    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      return { valid: false, error: 'Missing auth_date in initData' };
    }
    const authDate = parseInt(authDateStr, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    const MAX_AGE_SEC = 86400; // 24 hours
    if (isNaN(authDate) || nowSec - authDate > MAX_AGE_SEC || authDate > nowSec + 300) {
      return { valid: false, error: 'Telegram initData is expired or has invalid timestamp' };
    }

    // Sort key=value pairs alphabetically
    const pairs = [];
    for (const [k, v] of params.entries()) {
      pairs.push(`${k}=${v}`);
    }
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    // Secret key = HMAC_SHA256(botToken, "WebAppData")
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const hashBuffer = Buffer.from(hash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (hashBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(hashBuffer, computedBuffer)) {
      return { valid: false, error: 'Telegram initData hash signature mismatch' };
    }

    let user = null;
    const userStr = params.get('user');
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {}
    }

    return { valid: true, user, authDate };
  } catch (err) {
    return { valid: false, error: 'Failed validating initData signature' };
  }
}

/**
 * Standard security gate for Telegram API endpoints:
 * - Only POST allowed
 * - Reject permissive CORS
 * - Content-length limit check
 * - In-memory rate limiting
 * - Check server environment variable
 */
function applySecurityHeadersAndValidation(req, res, maxBytes = 10 * 1024 * 1024, allowedMethods = ['POST']) {
  // Method guard
  if (!allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods.join(', '));
    res.status(405).json({ ok: false, error: `Method Not Allowed. Only ${allowedMethods.join(', ')} accepted.` });
    return false;
  }

  // Security headers (no permissive CORS)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Payload size check
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > maxBytes) {
    res.status(413).json({ ok: false, error: 'Payload Too Large' });
    return false;
  }

  // Simple IP rate limit
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
    .toString()
    .split(',')[0]
    .trim();

  const now = Date.now();
  const history = rateLimitMap.get(ip) || [];
  const recent = history.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ ok: false, error: 'Too Many Requests. Please slow down.' });
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);

  // Validate server configuration
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || typeof botToken !== 'string' || !botToken.trim()) {
    console.error('SERVER ERROR: TELEGRAM_BOT_TOKEN environment variable is not configured');
    res.status(500).json({
      ok: false,
      error: 'Server misconfiguration: TELEGRAM_BOT_TOKEN is missing. Please set it in Vercel environment variables.'
    });
    return false;
  }

  return { botToken, ip };
}

/** Escape text before putting it inside a Telegram HTML message (prevents parse errors / injection). */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export { validateTelegramInitData, applySecurityHeadersAndValidation, escapeHtml };
