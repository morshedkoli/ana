/**
 * Stateless session tokens using HMAC-SHA-256 over Web Crypto.
 *
 * Format: base64url(payloadJson) + "." + base64url(signature)
 * Payload: { sub, role, eml, ep, iat, exp }
 *   - sub: user id
 *   - eml: email (kept short for cookie size)
 *   - role: 'admin' | 'user'
 *   - ep: sessionEpoch — bumping the user's epoch invalidates all sessions
 *   - iat: issued-at unix seconds
 *   - exp: expiry unix seconds
 *
 * Web Crypto means this verifies inside the Edge middleware without pulling
 * node:crypto, while signing also works on the Node runtime.
 */

export const COOKIE_NAME = 'studio_session';
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  sub: string;
  eml: string;
  role: 'admin' | 'user';
  ep: number;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'AUTH_SECRET env var missing or too short. Set a long random string ' +
      '(at least 32 chars) in your .env: `AUTH_SECRET=...`'
    );
  }
  return s;
}

function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
  // Allocate a fresh buffer so the resulting Uint8Array always backs onto a
  // plain ArrayBuffer (some lib types reject SharedArrayBuffer-backed views).
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Wrap a string in a Uint8Array backed by a plain ArrayBuffer. Strict TS
 *  rejects SharedArrayBuffer-backed views in `BufferSource`, so we always
 *  copy through a freshly-allocated ArrayBuffer to make the type concrete. */
function utf8(str: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(str);
  const buf = new ArrayBuffer(enc.byteLength);
  new Uint8Array(buf).set(enc);
  return new Uint8Array(buf);
}

/** Convert a generic Uint8Array into a guaranteed-ArrayBuffer-backed view. */
function toBufferSource(view: Uint8Array): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(view.byteLength);
  new Uint8Array(buf).set(view);
  return new Uint8Array(buf);
}

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret();
  return crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(
  data: Omit<SessionPayload, 'iat' | 'exp'>,
  ttlSec = SESSION_TTL_SEC,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...data, iat: now, exp: now + ttlSec };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, utf8(payloadB64));
  return `${payloadB64}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.', 2);
  if (!payloadB64 || !sigB64) return null;

  let key: CryptoKey;
  try { key = await getKey(); } catch { return null; }

  let sig: Uint8Array;
  try { sig = b64urlDecode(sigB64); } catch { return null; }

  const ok = await crypto.subtle.verify('HMAC', key, toBufferSource(sig), utf8(payloadB64));
  if (!ok) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch { return null; }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;
  return payload;
}
