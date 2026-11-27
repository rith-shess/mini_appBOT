// Shared product catalog, visible to ALL customers.
//   GET  /api/products                      -> public, returns every product
//   POST /api/products {product|products}   -> admin only (Telegram initData verified server-side)
//   POST /api/products {action:'delete',id} -> admin only
import { validateTelegramInitData, applySecurityHeadersAndValidation } from './_telegram.js';
import { storeConfigured, redis } from './_store.js';

const HASH_KEY = 'products:v1';
const MAX_PRODUCT_BYTES = 450 * 1024; // one product incl. its compressed photo

// Admins are checked on the SERVER. Override with Vercel env vars if needed.
function isAdmin(user) {
  if (!user) return false;
  const ids = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const names = (process.env.ADMIN_TELEGRAM_USERNAMES || 'rith_shees,rithshees,rithilysm,Skybalsupport')
    .split(',').map((s) => s.trim().replace('@', '').toLowerCase()).filter(Boolean);
  if (user.id && ids.includes(String(user.id))) return true;
  if (user.username && names.includes(String(user.username).toLowerCase())) return true;
  return false;
}

function cleanProduct(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.id !== 'string' || !p.id || p.id.length > 80) return null;
  if (!p.name || typeof p.name.en !== 'string') return null;
  if (typeof p.price !== 'number' || !isFinite(p.price) || p.price < 0) return null;
  if (typeof p.imageUrl !== 'string') return null;
  const json = JSON.stringify(p);
  if (json.length > MAX_PRODUCT_BYTES) return null;
  return json;
}

export default async function handler(req, res) {
  const security = applySecurityHeadersAndValidation(req, res, 8 * 1024 * 1024, ['GET', 'POST']);
  if (!security) return;
  const { botToken } = security;

  if (!storeConfigured()) {
    return res.status(503).json({ ok: false, error: 'store_not_configured' });
  }

  try {
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', HASH_KEY])) || [];
      const products = [];
      for (let i = 1; i < flat.length; i += 2) {
        try { products.push(JSON.parse(flat[i])); } catch { /* skip bad row */ }
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, products });
    }

    // POST = admin write
    const { initData, action, id, product, products } = req.body || {};
    const auth = validateTelegramInitData(initData, botToken);
    if (!auth.valid) {
      return res.status(401).json({ ok: false, error: `Unauthorized: ${auth.error}` });
    }
    if (!isAdmin(auth.user)) {
      return res.status(403).json({ ok: false, error: 'Your Telegram account is not an admin' });
    }

    if (action === 'delete') {
      if (typeof id !== 'string' || !id) return res.status(400).json({ ok: false, error: 'Missing id' });
      await redis(['HDEL', HASH_KEY, id]);
      return res.status(200).json({ ok: true });
    }

    const list = Array.isArray(products) ? products : product ? [product] : [];
    if (list.length === 0 || list.length > 200) {
      return res.status(400).json({ ok: false, error: 'Send product or products (max 200)' });
    }
    const args = ['HSET', HASH_KEY];
    for (const p of list) {
      const json = cleanProduct(p);
      if (!json) {
        return res.status(400).json({ ok: false, error: `Invalid or too large product: ${p?.id || '?'}` });
      }
      args.push(p.id, json);
    }
    await redis(args);
    return res.status(200).json({ ok: true, saved: list.length });
  } catch (err) {
    console.error('products handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
