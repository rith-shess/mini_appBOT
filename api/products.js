// Shared product catalog, visible to ALL customers.
//   GET  /api/products                       -> public list (light: photos are served by /api/image)
//   POST /api/products {product|products}    -> admin only
//   POST /api/products {action:'delete',id}  -> admin only
// Admin = logged in with the /admin password (cookie)  OR  an allowed Telegram admin (initData).
import { validateTelegramInitData, applySecurityHeadersAndValidation } from './_telegram.js';
import { storeConfigured, redis } from './_store.js';
import { hasValidAdminSession } from './_admin.js';

const HASH_KEY = 'products:v1';
const IMG_KEY = 'product-images:v1';
const MAX_PRODUCT_BYTES = 60 * 1024;   // product record without its photo
const MAX_IMAGE_CHARS = 600 * 1024;    // one compressed photo (base64 text)
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const DATA_IMG_RE = /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function isTelegramAdmin(user) {
  if (!user) return false;
  const ids = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const names = (process.env.ADMIN_TELEGRAM_USERNAMES || 'rith_shees,rithshees,rithilysm,Skybalsupport')
    .split(',').map((s) => s.trim().replace('@', '').toLowerCase()).filter(Boolean);
  if (user.id && ids.includes(String(user.id))) return true;
  if (user.username && names.includes(String(user.username).toLowerCase())) return true;
  return false;
}

/** Validates one product. Returns { error } or { product, image } (image = data URL to store separately). */
function prepareProduct(p) {
  if (!p || typeof p !== 'object') return { error: 'Invalid product' };
  if (typeof p.id !== 'string' || !ID_RE.test(p.id)) return { error: 'Invalid product id' };
  if (!p.name || typeof p.name.en !== 'string' || !p.name.en.trim()) return { error: `Product ${p.id}: name is required` };
  if (typeof p.price !== 'number' || !isFinite(p.price) || p.price < 0) return { error: `Product ${p.id}: invalid price` };
  if (typeof p.imageUrl !== 'string') return { error: `Product ${p.id}: missing photo` };

  const product = { ...p };
  let image = null;
  if (product.imageUrl.startsWith('data:')) {
    if (!DATA_IMG_RE.test(product.imageUrl)) return { error: `Product ${p.id}: unsupported image type` };
    if (product.imageUrl.length > MAX_IMAGE_CHARS) return { error: `Product ${p.id}: photo is too large` };
    image = product.imageUrl;
    product.imageUrl = `/api/image?id=${encodeURIComponent(p.id)}&v=${Date.now().toString(36)}`;
  } else if (!/^(https?:\/\/|\/api\/image\?)/.test(product.imageUrl)) {
    return { error: `Product ${p.id}: invalid photo link` };
  }
  if (JSON.stringify(product).length > MAX_PRODUCT_BYTES) return { error: `Product ${p.id}: too much data` };
  return { product, image };
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!storeConfigured()) {
    return res.status(503).json({ ok: false, error: 'store_not_configured' });
  }

  try {
    // ---- Public read (no rate limit: many customers can share one mobile IP) ----
    if (req.method === 'GET') {
      const flat = (await redis(['HGETALL', HASH_KEY])) || [];
      const products = [];
      for (let i = 1; i < flat.length; i += 2) {
        try { products.push(JSON.parse(flat[i])); } catch { /* skip bad row */ }
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, products });
    }

    // ---- Admin writes ----
    const security = applySecurityHeadersAndValidation(req, res, 8 * 1024 * 1024, ['POST']);
    if (!security) return;
    const { botToken } = security;

    const { initData, action, id, product, products } = req.body || {};

    if (!hasValidAdminSession(req)) {
      if (!initData) {
        return res.status(401).json({ ok: false, error: 'Not logged in. Please log in at /admin.' });
      }
      const auth = validateTelegramInitData(initData, botToken);
      if (!auth.valid) return res.status(401).json({ ok: false, error: `Unauthorized: ${auth.error}` });
      if (!isTelegramAdmin(auth.user)) return res.status(403).json({ ok: false, error: 'Your Telegram account is not an admin' });
    }

    if (action === 'delete') {
      if (typeof id !== 'string' || !ID_RE.test(id)) return res.status(400).json({ ok: false, error: 'Invalid id' });
      await redis(['HDEL', HASH_KEY, id]);
      await redis(['HDEL', IMG_KEY, id]);
      return res.status(200).json({ ok: true });
    }

    const list = Array.isArray(products) ? products : product ? [product] : [];
    if (list.length === 0 || list.length > 200) {
      return res.status(400).json({ ok: false, error: 'Send product or products (max 200)' });
    }

    const prepared = [];
    for (const p of list) {
      const r = prepareProduct(p);
      if (r.error) return res.status(400).json({ ok: false, error: r.error });
      prepared.push(r);
    }

    const imageArgs = ['HSET', IMG_KEY];
    const productArgs = ['HSET', HASH_KEY];
    for (const { product: pr, image } of prepared) {
      if (image) imageArgs.push(pr.id, image);
      productArgs.push(pr.id, JSON.stringify(pr));
    }
    if (imageArgs.length > 2) await redis(imageArgs); // photos first, so a product never points at a missing photo
    await redis(productArgs);

    return res.status(200).json({ ok: true, saved: prepared.length, products: prepared.map((x) => x.product) });
  } catch (err) {
    console.error('products handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
