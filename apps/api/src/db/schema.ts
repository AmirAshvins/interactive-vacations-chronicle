import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { MapDisplaySettings } from '@ivc/shared';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const travelogues = pgTable('travelogues', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 80 }),
  homeCityKey: varchar('home_city_key', { length: 64 }).notNull().default('toronto'),
  mapSettings: jsonb('map_settings')
    .$type<MapDisplaySettings>()
    .notNull()
    .default({ showFlightPaths: true, highlightVisited: true }),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const travelogueMembers = pgTable(
  'travelogue_members',
  {
    travelogueId: uuid('travelogue_id')
      .notNull()
      .references(() => travelogues.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('editor'),
  },
  (t) => [primaryKey({ columns: [t.travelogueId, t.userId] })],
);

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  travelogueId: uuid('travelogue_id')
    .notNull()
    .references(() => travelogues.id, { onDelete: 'cascade' }),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  cityKey: varchar('city_key', { length: 64 }),
  name: varchar('name', { length: 200 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  description: text('description').notNull().default(''),
  material: varchar('material', { length: 10 }).notNull().default('brass'),
  startYear: integer('start_year'),
  startMonth: integer('start_month'),
  endYear: integer('end_year'),
  endMonth: integer('end_month'),
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tripImages = pgTable('trip_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 64 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  attachedAt: timestamp('attached_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tvSessions = pgTable('tv_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pairingCode: varchar('pairing_code', { length: 8 }).notNull().unique(),
  travelogueId: uuid('travelogue_id').references(() => travelogues.id),
  displayLabel: varchar('display_label', { length: 80 }),
  claimedByUserId: uuid('claimed_by_user_id').references(() => users.id),
  deviceTokenHash: varchar('device_token_hash', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const syncOutbox = pgTable(
  'sync_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travelogueId: uuid('travelogue_id').notNull(),
    clientMutationId: varchar('client_mutation_id', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sync_outbox_client_mutation').on(t.travelogueId, t.clientMutationId)],
);
