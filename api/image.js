// GET /api/image?id=<productId>  -> the product photo as a real image file.
// Cached for a year by the browser and Vercel's CDN (the URL changes when the photo changes),
// so each photo is downloaded from the database only once.
import { storeConfigured, redis } from './_store.js';

const IMG_KEY = 'product-images:v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  if (!storeConfigured()) return res.status(503).end();

  let id = '';
  try {
    id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  } catch {}
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return res.status(400).end();

  try {
    const dataUrl = await redis(['HGET', IMG_KEY, id]);
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return res.status(404).end();
    const buffer = Buffer.from(m[2], 'base64');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.statusCode = 200;
    return res.end(buffer);
  } catch (err) {
    console.error('image handler error:', err);
    return res.status(500).end();
  }
}
