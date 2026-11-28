// GET  /api/admin-login                 -> { loggedIn, configured }
// POST /api/admin-login {password}      -> sets a 12h session cookie
// POST /api/admin-login {action:'logout'}
import { adminConfigured, safeEqual, makeSessionCookie, clearSessionCookie, hasValidAdminSession } from './_admin.js';

const attempts = new Map(); // ip -> [timestamps]  (best effort, per server instance)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, configured: adminConfigured(), loggedIn: hasValidAdminSession(req) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const body = req.body || {};
  if (body.action === 'logout') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (!adminConfigured()) {
    return res.status(503).json({ ok: false, error: 'admin_not_configured' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Please wait 10 minutes.' });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    recent.push(now);
    attempts.set(ip, recent);
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return res.status(401).json({ ok: false, error: 'Wrong password' });
  }

  attempts.delete(ip);
  res.setHeader('Set-Cookie', makeSessionCookie());
  return res.status(200).json({ ok: true });
}
