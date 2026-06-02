import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../env.js';

const UPLOAD_TTL_MS = 15 * 60 * 1000;

export function createUploadToken(storageKey: string, expiresAt: Date): string {
  const payload = `${storageKey}|${expiresAt.getTime()}`;
  const sig = createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

export function verifyUploadToken(token: string, storageKey: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;
    const [key, expStr, sig] = parts;
    if (key !== storageKey) return false;
    const expiresAt = Number(expStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    const payload = `${key}|${expStr}`;
    const expected = createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function uploadExpiresAt(): Date {
  return new Date(Date.now() + UPLOAD_TTL_MS);
}
