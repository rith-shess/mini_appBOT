// Server-side admin session (password login for use in a normal browser).
// Set ADMIN_PASSWORD (min 8 chars) in Vercel. Optional: ADMIN_SESSION_SECRET.
import crypto from 'crypto';

const COOKIE = 'admin_session';
const TTL_SEC = 12 * 60 * 60; // 12 hours

export function adminConfigured() {
  const p = process.env.ADMIN_PASSWORD;
  return typeof p === 'string' && p.length >= 8;
}

function secret() {
  return `${process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''}|admin-session-v1`;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

/** Constant-time string comparison (hashes first so lengths never leak). */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function makeSessionCookie() {
  const payload = String(Date.now() + TTL_SEC * 1000);
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL_SEC}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function hasValidAdminSession(req) {
  if (!adminConfigured()) return false;
  const header = req.headers?.cookie || '';
  const match = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const token = match.slice(COOKIE.length + 1);
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const exp = parseInt(payload, 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(sig, sign(payload));
}
