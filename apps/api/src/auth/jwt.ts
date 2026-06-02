import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  scope: 'user';
}

export async function createAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId, scope: 'user' satisfies AccessTokenPayload['scope'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const sid = payload.sid;
    if (typeof sub !== 'string' || typeof sid !== 'string') return null;
    return { sub, sid, scope: 'user' };
  } catch {
    return null;
  }
}
