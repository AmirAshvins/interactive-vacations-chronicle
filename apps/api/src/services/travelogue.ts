import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { travelogueMembers, travelogues, trips, users } from '../db/schema.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';

export type MemberRole = 'owner' | 'editor' | 'viewer';

const ROLE_RANK: Record<MemberRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export async function getMemberRole(
  db: Database,
  travelogueId: string,
  userId: string,
): Promise<MemberRole | null> {
  const row = await db
    .select({ role: travelogueMembers.role })
    .from(travelogueMembers)
    .where(
      and(eq(travelogueMembers.travelogueId, travelogueId), eq(travelogueMembers.userId, userId)),
    )
    .limit(1);
  const role = row[0]?.role;
  if (role === 'owner' || role === 'editor' || role === 'viewer') return role;
  return null;
}

export function requireRole(role: MemberRole | null, minimum: MemberRole): MemberRole {
  if (!role || ROLE_RANK[role] < ROLE_RANK[minimum]) forbidden();
  return role;
}

export async function listTravelogueSummariesForUser(db: Database, userId: string) {
  const rows = await db
    .select({
      id: travelogues.id,
      name: travelogues.name,
      role: travelogueMembers.role,
      version: travelogues.version,
      updatedAt: travelogues.updatedAt,
    })
    .from(travelogueMembers)
    .innerJoin(travelogues, eq(travelogueMembers.travelogueId, travelogues.id))
    .where(eq(travelogueMembers.userId, userId));

  const summaries = [];
  for (const row of rows) {
    const [tripCountRow] = await db
      .select({ value: count() })
      .from(trips)
      .where(and(eq(trips.travelogueId, row.id), isNull(trips.deletedAt)));
    summaries.push({
      ...row,
      role: row.role as MemberRole,
      tripCount: Number(tripCountRow?.value ?? 0),
    });
  }
  return summaries;
}

export async function createTravelogue(db: Database, userId: string, name: string) {
  const [created] = await db
    .insert(travelogues)
    .values({ ownerId: userId, name })
    .returning();

  if (!created) throw new AppError('Failed to create travelogue', 'INTERNAL', 500);

  await db.insert(travelogueMembers).values({
    travelogueId: created.id,
    userId,
    role: 'owner',
  });

  return {
    id: created.id,
    name: created.name,
    role: 'owner' as const,
    tripCount: 0,
    version: created.version,
    updatedAt: created.updatedAt,
  };
}

export async function getTravelogueById(db: Database, travelogueId: string, userId: string) {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'viewer');

  const [row] = await db.select().from(travelogues).where(eq(travelogues.id, travelogueId)).limit(1);
  if (!row) notFound('Travelogue not found');

  const tripRows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.travelogueId, travelogueId), isNull(trips.deletedAt)))
    .orderBy(asc(trips.createdAt));

  return { travelogue: row, trips: tripRows };
}

export async function updateTravelogue(
  db: Database,
  travelogueId: string,
  userId: string,
  input: {
    name?: string;
    homeCityKey?: string;
    mapSettings?: { showFlightPaths?: boolean; highlightVisited?: boolean };
  },
) {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'editor');

  const [existing] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.id, travelogueId))
    .limit(1);
  if (!existing) notFound('Travelogue not found');

  const mapSettings = {
    ...existing.mapSettings,
    ...input.mapSettings,
  };

  const [updated] = await db
    .update(travelogues)
    .set({
      name: input.name ?? existing.name,
      homeCityKey: input.homeCityKey ?? existing.homeCityKey,
      mapSettings,
      updatedAt: new Date(),
    })
    .where(eq(travelogues.id, travelogueId))
    .returning();

  if (!updated) throw new AppError('Failed to update travelogue', 'INTERNAL', 500);
  return updated;
}

export async function deleteTravelogue(db: Database, travelogueId: string, userId: string) {
  const role = await getMemberRole(db, travelogueId, userId);
  requireRole(role, 'owner');

  await db.delete(travelogues).where(eq(travelogues.id, travelogueId));
  return true;
}

export async function getUserById(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
