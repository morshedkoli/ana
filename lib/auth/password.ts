/**
 * Password hashing with Node's built-in scrypt.
 *
 * Stored format:  scrypt:N:r:p:saltHex:keyHex
 * No external dependencies; scrypt is in node:crypto.
 *
 * Edge runtime cannot access node:crypto, so this module is only used from
 * server actions / route handlers that run on the Node runtime.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scrypt(
  password: string,
  salt: Buffer,
  keyLen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keyLen, options, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${r}:${p}:${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !password) return false;
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, keyHex] = parts;
  const N = parseInt(nStr, 10);
  const r = parseInt(rStr, 10);
  const p = parseInt(pStr, 10);
  if (!N || !r || !p) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
