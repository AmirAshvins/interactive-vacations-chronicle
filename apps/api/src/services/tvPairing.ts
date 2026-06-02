import { and, eq, isNull, lt } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { tvSessions } from '../db/schema.js';
import {
  createTvDeviceToken,
  hashDeviceToken,
  verifyTvDeviceToken,
} from '../auth/tvDeviceToken.js';
import { env } from '../env.js';
import { AppError, notFound } from '../lib/errors.js';
import { getMemberRole, requireRole } from './travelogue.js';
import { tvSessionPubSub, type TvSessionPayload } from '../pubsub/tvSession.js';

const PAIRING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += PAIRING_ALPHABET[Math.floor(Math.random() * PAIRING_ALPHABET.length)];
  }
  return code;
}

function pairingUrl(code: string): string {
  const base = env.PUBLIC_APP_ORIGIN.replace(/\/$/, '');
  return `${base}/pair?code=${encodeURIComponent(code)}`;
}

function toPayload(
  row: typeof tvSessions.$inferSelect,
  deviceToken?: string | null,
): TvSessionPayload {
  return {
    id: row.id,
    pairingCode: row.pairingCode,
    pairingUrl: pairingUrl(row.pairingCode),
    expiresAt: row.expiresAt.toISOString(),
    claimed: row.claimedAt !== null,
    travelogueId: row.travelogueId,
    displayLabel: row.displayLabel,
    deviceToken: deviceToken ?? null,
  };
}

export async function purgeExpiredTvSessions(db: Database): Promise<void> {
  await db.delete(tvSessions).where(lt(tvSessions.expiresAt, new Date()));
}

export async function createTvSession(db: Database, displayLabel?: string | null) {
  await purgeExpiredTvSessions(db);

  const expiresAt = new Date(Date.now() + env.TV_PAIRING_TTL_SECONDS * 1000);
  let pairingCode = generatePairingCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [created] = await db
        .insert(tvSessions)
        .values({
          pairingCode,
          displayLabel: displayLabel ?? null,
          expiresAt,
        })
        .returning();
      if (!created) throw new AppError('Failed to create TV session', 'INTERNAL', 500);
      return toPayload(created);
    } catch {
      pairingCode = generatePairingCode();
    }
  }

  throw new AppError('Failed to allocate pairing code', 'INTERNAL', 500);
}

export async function getTvSessionById(db: Database, sessionId: string) {
  const [row] = await db.select().from(tvSessions).where(eq(tvSessions.id, sessionId)).limit(1);
  return row ?? null;
}

export async function getTvSessionByCode(db: Database, code: string) {
  const normalized = code.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(tvSessions)
    .where(eq(tvSessions.pairingCode, normalized))
    .limit(1);
  return row ?? null;
}

export async function claimTvSession(
  db: Database,
  code: string,
  travelogueId: string,
  userId: string,
) {
  const row = await getTvSessionByCode(db, code);
  if (!row) notFound('Invalid pairing code');
  if (row.claimedAt) throw new AppError('TV session already claimed', 'BAD_REQUEST', 400);
  if (row.expiresAt < new Date()) {
    throw new AppError('Pairing code expired', 'BAD_REQUEST', 400);
  }

  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'editor');

  const deviceToken = await createTvDeviceToken(row.id, travelogueId);
  const tokenHash = hashDeviceToken(deviceToken);

  const [updated] = await db
    .update(tvSessions)
    .set({
      travelogueId,
      claimedByUserId: userId,
      deviceTokenHash: tokenHash,
      claimedAt: new Date(),
    })
    .where(and(eq(tvSessions.id, row.id), isNull(tvSessions.claimedAt)))
    .returning();

  if (!updated) throw new AppError('TV session already claimed', 'BAD_REQUEST', 400);

  const payload = toPayload(updated, deviceToken);
  tvSessionPubSub.publish('tv-session-updated', updated.id, payload);
  return payload;
}

export async function validateTvDeviceAccess(
  db: Database,
  tvSessionId: string,
  travelogueId: string,
  bearerToken: string,
): Promise<boolean> {
  const payload = await verifyTvDeviceToken(bearerToken);
  if (!payload || payload.sub !== tvSessionId || payload.tid !== travelogueId) {
    return false;
  }

  const row = await getTvSessionById(db, tvSessionId);
  if (!row?.claimedAt || !row.deviceTokenHash || row.travelogueId !== travelogueId) {
    return false;
  }

  return row.deviceTokenHash === hashDeviceToken(bearerToken);
}

export async function unpairTvSession(db: Database, tvSessionId: string, bearerToken: string) {
  const row = await getTvSessionById(db, tvSessionId);
  if (!row?.travelogueId) notFound('TV session not found');
  const ok = await validateTvDeviceAccess(db, tvSessionId, row.travelogueId, bearerToken);
  if (!ok) throw new AppError('Invalid TV device token', 'UNAUTHENTICATED', 401);

  await db.delete(tvSessions).where(eq(tvSessions.id, tvSessionId));
  return true;
}
