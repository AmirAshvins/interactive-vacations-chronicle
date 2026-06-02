import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface TvDeviceTokenPayload {
  sub: string;
  tid: string;
  scope: 'tv';
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createTvDeviceToken(
  tvSessionId: string,
  travelogueId: string,
): Promise<string> {
  return new SignJWT({ tid: travelogueId, scope: 'tv' satisfies TvDeviceTokenPayload['scope'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(tvSessionId)
    .setIssuedAt()
    .setExpirationTime(`${env.TV_DEVICE_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyTvDeviceToken(
  token: string,
): Promise<TvDeviceTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const tid = payload.tid;
    const scope = payload.scope;
    if (typeof sub !== 'string' || typeof tid !== 'string' || scope !== 'tv') return null;
    return { sub, tid, scope: 'tv' };
  } catch {
    return null;
  }
}
