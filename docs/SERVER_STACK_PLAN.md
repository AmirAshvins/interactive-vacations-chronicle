# Server stack — implementation plan & infrastructure guide

This document covers the **recommended cost-optimized stack** for Interactive Vacations Chronicle:

| Layer | Choice |
|-------|--------|
| Database | Neon Postgres |
| API | Node.js GraphQL (Yoga) on Fly.io |
| Realtime | GraphQL subscriptions via `graphql-ws` |
| Pub/sub | In-process first → Upstash Redis when scaling |
| Images | Cloudflare R2 + presigned uploads + CDN |
| Auth | Lucia (sessions) + short-lived JWT for WebSocket |
| Sync | LWW per trip + monotonic `version` + IndexedDB offline cache |
| Client hosting | Cloudflare Pages (static Vite build) |

**Product decisions baked in:**

1. Multiple travelogues per account + management UI  
2. Offline works and persists (IndexedDB + sync outbox)  
3. Cheap image storage (client compress → R2, never Postgres blobs)  
4. LWW sync (OT deferred unless true co-editing is required)  
5. JWT in `graphql-ws` `connectionParams` for subscriptions  
6. **Phone is a first-class standalone platform** — full map, chronicle, settings, and account UX on mobile layout; TV QR pairing is optional and only for living-room display sessions  

---

## Table of contents

1. [Architecture](#1-architecture)  
   - [Platform model (phone / desktop / TV)](#14-platform-model-phone--desktop--tv)
2. [Repository layout](#2-repository-layout)
3. [Database schema](#3-database-schema)
4. [GraphQL API design](#4-graphql-api-design)
5. [Authentication & authorization](#5-authentication--authorization)
6. [Sync & offline model](#6-sync--offline-model)
7. [Image pipeline](#7-image-pipeline)
8. [TV pairing (QR)](#8-tv-pairing-qr)
9. [Client integration plan](#9-client-integration-plan)
10. [Implementation phases](#10-implementation-phases)
11. [Infrastructure setup guide](#11-infrastructure-setup-guide)
12. [Environment variables reference](#12-environment-variables-reference)
13. [Local development](#13-local-development)
14. [Deployment & CI/CD](#14-deployment--cicd)
15. [Production checklist](#15-production-checklist)
16. [Cost & scaling triggers](#16-cost--scaling-triggers)

---

## 1. Architecture

### 1.1 System diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare (edge)                                │
│  Pages: app.ivchronicle.app (Vite SPA)                                   │
│  CDN:   cdn.ivchronicle.app → R2 bucket (public or signed)               │
└─────────────────────────────────────────────────────────────────────────┘
         │ HTTPS                           │ presigned PUT / CDN GET
         ▼                                 ▼
┌─────────────────────┐            ┌──────────────────┐
│  Fly.io             │            │  Cloudflare R2   │
│  api.ivchronicle.app│            │  ivc-images  │
│  ┌───────────────┐  │            └──────────────────┘
│  │ GraphQL Yoga  │  │
│  │ HTTP + WS     │  │◄────── graphql-ws subscriptions
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │     ┌─────────────────┐
│  │ PubSub        │◄─┼────►│ Upstash Redis   │  (Phase 2+, multi-instance)
│  └───────────────┘  │     └─────────────────┘
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Neon Postgres      │
│  ivc_production │
└─────────────────────┘
```

### 1.2 Request paths

| Action | Path |
|--------|------|
| Sign up / sign in | `POST /auth/*` (Lucia routes) or GraphQL mutations |
| Load travelogue | `query travelogue(id)` |
| Edit trip (phone) | `mutation updateTrip` → DB → pub/sub → subscription |
| TV receives update | WS `subscription travelogueUpdated` |
| Upload photo | `mutation requestImageUpload` → presigned PUT → `mutation attachImage` |
| TV pairing | `mutation createTvSession` → QR → phone `claimTvSession` |
| Offline reconnect | `query syncDelta(sinceVersion)` + `mutation pushChanges` |

### 1.3 What stays client-side

Unchanged or lightly adapted:

- Map rendering, solar engine, TV focus (`TvFocusContext`)
- Environment detection (`detectEnvironment.ts`)
- Device-local settings: `tvInteraction`, `mobileLayout`, screensaver
- Chronicle templates import (becomes server `importChronicle` mutation)

Replaced / wrapped:

- `useTravelogueStore` → `useSyncedTravelogueStore` (server + IndexedDB)
- Direct IndexedDB writes → sync outbox when offline
- `ChronicleTransfer` export → backup; server is source of truth

### 1.4 Platform model (phone / desktop / TV)

Three clients share **one SPA** (`apps/web`) and **one GraphQL API**. Layout and capabilities adapt via environment detection (`detectEnvironment.ts`) — not separate phone/TV apps.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interactive Vacations Chronicle                 │
│                         (single web app)                         │
├──────────────┬──────────────────────┬───────────────────────────┤
│    Phone     │      Desktop         │           TV              │
│  standalone  │    standalone        │   display-first           │
│  full editor │    full editor       │   browse + screensaver    │
│  mobile UI   │    inset map UI      │   D-pad focus             │
└──────────────┴──────────────────────┴───────────────────────────┘
         │              │                         │
         └──────────────┴─────────────────────────┘
                              │
                    GraphQL + subscriptions
                              │
                         Neon + R2
```

| Platform | Mode | Editing | Typical entry |
|----------|------|---------|---------------|
| **Phone** | `standalone` | Full — trips, photos, chronicle, travelogue settings, account | PWA / mobile browser → `/t/:id` |
| **Desktop** | `standalone` | Full — same as phone, desktop layout | Browser → `/t/:id` |
| **TV** | `display` | Read-only on device; **phone (or desktop) is the editor** | Browser on TV → `/tv` |
| **Phone (during TV session)** | `standalone` + optional `paired` | Unchanged full UX; pairing adds “control this TV” context | Scan TV QR → `/pair?code=…` |

**Important:** QR pairing does **not** replace the phone app with a stripped-down remote. After pairing, the user continues in the normal phone UI (bottom sheets, trip editor, settings). Mutations sync to the server; the TV subscription applies updates on the big screen.

**What TV shows without pairing:** QR pairing screen only (or last paired travelogue if a device token exists).

**What phone shows without TV:** Everything — no QR, no TV session required.

**Shared server state:** `travelogueId`, trips, images, travelogue settings (`homeCityKey`, map flags).  
**Device-local state:** `tvInteraction`, `mobileLayout`, screensaver, material preview overrides.

---

## 2. Repository layout

Convert to a **pnpm or yarn workspaces monorepo** (recommended before Phase 1):

```
interactive-vacations-chronicle/
├── apps/
│   ├── web/                    # current Vite app (move src/ here)
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── api/                    # GraphQL server
│       ├── src/
│       │   ├── index.ts        # HTTP + WS entry
│       │   ├── context.ts      # user, db, pubsub
│       │   ├── schema/         # GraphQL typeDefs + resolvers
│       │   ├── auth/           # Lucia setup, JWT helpers
│       │   ├── db/             # Drizzle schema + migrations
│       │   ├── services/       # travelogue, sync, pairing, images
│       │   └── pubsub/         # in-memory → Redis adapter
│       ├── drizzle.config.ts
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/                 # types shared by web + api
│       ├── src/
│       │   ├── travelogue.ts   # Trip, Travelogue types (from current types/)
│       │   └── sync.ts         # PatchOp, SyncDelta types
│       └── package.json
├── docs/
├── package.json                # workspaces root
└── turbo.json                  # optional: turbo for build orchestration
```

**Migration note:** Start with `packages/shared` extracting `src/types/travelogue.ts` so web and API never drift.

---

## 3. Database schema

Use **Drizzle ORM** + Neon Postgres. All tables use `uuid` primary keys unless noted.

### 3.1 ER overview

```
users ──┬── travelogue_members ── travelogues ── trips ── trip_images
        │                              │
        └── sessions (Lucia)           └── tv_sessions
```

### 3.2 Drizzle schema (reference)

```typescript
// apps/api/src/db/schema.ts

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  passwordHash: varchar('password_hash', { length: 255 }), // null if OAuth-only later
  displayName: varchar('display_name', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(), // Lucia session id
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const travelogues = pgTable('travelogues', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 80 }), // optional URL-friendly id
  homeCityKey: varchar('home_city_key', { length: 64 }).default('toronto'),
  mapSettings: jsonb('map_settings').$type<{ showFlightPaths: boolean; highlightVisited: boolean }>(),
  version: integer('version').notNull().default(0), // bumped on any trip change
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const travelogueMembers = pgTable('travelogue_members', {
  travelogueId: uuid('travelogue_id').notNull().references(() => travelogues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('editor'), // owner | editor | viewer
}, (t) => [primaryKey({ columns: [t.travelogueId, t.userId] })]);

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  travelogueId: uuid('travelogue_id').notNull().references(() => travelogues.id, { onDelete: 'cascade' }),
  countryCode: varchar('country_code', { length: 2 }).notNull(),
  cityKey: varchar('city_key', { length: 64 }),
  name: varchar('name', { length: 200 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  description: text('description').notNull().default(''),
  material: varchar('material', { length: 10 }).notNull().default('brass'), // brass | copper
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
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(), // R2 object key
  mimeType: varchar('mime_type', { length: 64 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tvSessions = pgTable('tv_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pairingCode: varchar('pairing_code', { length: 8 }).notNull().unique(),
  travelogueId: uuid('travelogue_id').references(() => travelogues.id),
  displayLabel: varchar('display_label', { length: 80 }), // "Living room TV"
  claimedByUserId: uuid('claimed_by_user_id').references(() => users.id),
  deviceTokenHash: varchar('device_token_hash', { length: 255 }), // hashed long-lived TV token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const syncOutbox = pgTable('sync_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  travelogueId: uuid('travelogue_id').notNull(),
  clientMutationId: varchar('client_mutation_id', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('sync_outbox_client_mutation').on(t.travelogueId, t.clientMutationId)]);
```

### 3.3 Indexes

```sql
CREATE INDEX idx_trips_travelogue ON trips(travelogue_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_updated ON trips(travelogue_id, updated_at);
CREATE INDEX idx_trip_images_trip ON trip_images(trip_id, sort_order);
CREATE INDEX idx_tv_sessions_code ON tv_sessions(pairing_code) WHERE claimed_at IS NULL;
CREATE INDEX idx_travelogue_members_user ON travelogue_members(user_id);
```

### 3.4 Neon branches

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `dev` | Shared staging |
| Local | `DATABASE_URL` from Neon dev branch or Docker Postgres |

---

## 4. GraphQL API design

### 4.1 Stack packages

```json
{
  "dependencies": {
    "graphql": "^16",
    "graphql-yoga": "^5",
    "graphql-ws": "^6",
    "ws": "^8",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/s3-request-presigner": "^3",
    "drizzle-orm": "^0.38",
    "postgres": "^3",
    "lucia": "^3",
    "@lucia-auth/adapter-drizzle": "^1",
    "oslo": "^1",
    "jose": "^5",
    "zod": "^3"
  }
}
```

### 4.2 Schema (SDL)

```graphql
scalar DateTime

enum Material { brass copper }
enum MemberRole { owner editor viewer }
enum PatchOp { CREATED UPDATED DELETED }

type User {
  id: ID!
  email: String!
  displayName: String
  travelogues: [TravelogueSummary!]!
}

type TravelogueSummary {
  id: ID!
  name: String!
  role: MemberRole!
  tripCount: Int!
  updatedAt: DateTime!
  version: Int!
}

type Travelogue {
  id: ID!
  name: String!
  homeCityKey: String!
  mapSettings: MapSettings!
  version: Int!
  trips: [Trip!]!
  updatedAt: DateTime!
}

type MapSettings {
  showFlightPaths: Boolean!
  highlightVisited: Boolean!
}

type Trip {
  id: ID!
  countryCode: String!
  cityKey: String
  name: String!
  lat: Float!
  lng: Float!
  description: String!
  material: Material!
  startYear: Int
  startMonth: Int
  endYear: Int
  endMonth: Int
  version: Int!
  imageUrls: [String!]!
  updatedAt: DateTime!
}

type SyncDelta {
  travelogueVersion: Int!
  trips: [TripPatch!]!
}

type TripPatch {
  op: PatchOp!
  trip: Trip
  tripId: ID
}

type ImageUploadRequest {
  imageId: ID!
  uploadUrl: String!
  publicUrl: String!
  expiresAt: DateTime!
}

type TvSession {
  id: ID!
  pairingCode: String!
  pairingUrl: String!
  expiresAt: DateTime!
  claimed: Boolean!
  travelogueId: ID
}

type AuthPayload {
  user: User!
  accessToken: String!
  expiresIn: Int!
}

type Query {
  me: User
  travelogue(id: ID!): Travelogue
  syncDelta(travelogueId: ID!, sinceVersion: Int!): SyncDelta!
}

type Mutation {
  signUp(email: String!, password: String!, displayName: String): AuthPayload!
  signIn(email: String!, password: String!): AuthPayload!
  signOut: Boolean!
  refreshAccessToken: AuthPayload!

  createTravelogue(name: String!): TravelogueSummary!
  updateTravelogue(id: ID!, name: String, homeCityKey: String, mapSettings: MapSettingsInput): Travelogue!
  deleteTravelogue(id: ID!): Boolean!

  createTrip(travelogueId: ID!, input: TripInput!, clientMutationId: String!): Trip!
  updateTrip(id: ID!, input: TripInput!, baseVersion: Int!, clientMutationId: String!): Trip!
  deleteTrip(id: ID!, baseVersion: Int!, clientMutationId: String!): Boolean!

  requestImageUpload(tripId: ID!, mimeType: String!, sizeBytes: Int!): ImageUploadRequest!
  attachImage(tripId: ID!, imageId: ID!, clientMutationId: String!): Trip!
  detachImage(tripId: ID!, imageId: ID!, clientMutationId: String!): Trip!

  importChronicle(travelogueId: ID!, json: String!, mode: ImportMode!): Travelogue!
  pushChanges(travelogueId: ID!, changes: [ChangeInput!]!): SyncDelta!

  createTvSession(displayLabel: String): TvSession!
  claimTvSession(code: String!, travelogueId: ID!): TvSession!
}

type Subscription {
  travelogueUpdated(travelogueId: ID!): TripPatch!
  tvSessionUpdated(sessionId: ID!): TvSession!
}

input MapSettingsInput {
  showFlightPaths: Boolean
  highlightVisited: Boolean
}

input TripInput {
  countryCode: String!
  cityKey: String
  name: String!
  lat: Float!
  lng: Float!
  description: String
  material: Material
  startYear: Int
  startMonth: Int
  endYear: Int
  endMonth: Int
}

input ChangeInput {
  clientMutationId: String!
  type: String!
  tripId: ID
  baseVersion: Int
  payload: String # JSON TripInput or null for delete
}

enum ImportMode { REPLACE MERGE }
```

### 4.3 Server entry (HTTP + WebSocket)

```typescript
// apps/api/src/index.ts — structural sketch

import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: '/graphql',
});

const server = createServer(yoga);
const wss = new WebSocketServer({ server, path: '/graphql' });

useServer(
  {
    schema,
    context: (ctx) => createWsContext(ctx),
    onConnect: async ({ connectionParams }) => {
      await verifyAccessToken(connectionParams?.Authorization as string);
    },
  },
  wss,
);

server.listen(process.env.PORT ?? 4000);
```

### 4.4 Resolver rules

Every resolver that touches a travelogue:

1. Resolve `ctx.user` from session cookie (HTTP) or JWT (WS).
2. Check `travelogue_members` for `owner | editor | viewer`.
3. Mutations require `editor` or `owner`; TV device token allows `viewer` + heartbeat only.

On successful trip mutation:

1. Increment `trips.version` and `travelogues.version`.
2. Publish `TripPatch` to pub/sub channel `travelogue:{id}`.
3. Return updated trip to mutation caller.

---

## 5. Authentication & authorization

### 5.1 Flow

```
Sign in → Lucia creates session → HttpOnly cookie (refresh)
       → API returns accessToken (JWT, 15 min) in JSON body

GraphQL HTTP → cookie validates session OR Authorization: Bearer <accessToken>
GraphQL WS   → connectionParams: { Authorization: "Bearer <accessToken>" }

Access expired → mutation refreshAccessToken (cookie) → new accessToken
```

### 5.2 JWT claims

```json
{
  "sub": "user-uuid",
  "sid": "session-id",
  "exp": 1234567890,
  "scope": "user"
}
```

**TV device token** (optional separate JWT):

```json
{
  "sub": "tv-session-uuid",
  "tid": "travelogue-uuid",
  "scope": "tv_display",
  "exp": "90d"
}
```

Store only `deviceTokenHash` in `tv_sessions`; raw token shown once to TV client.

### 5.3 Role matrix

| Action | owner | editor | viewer | tv_display |
|--------|-------|--------|--------|------------|
| Read travelogue | ✓ | ✓ | ✓ | ✓ |
| CRUD trips | ✓ | ✓ | ✗ | ✗ |
| Upload images | ✓ | ✓ | ✗ | ✗ |
| Manage members | ✓ | ✗ | ✗ | ✗ |
| Delete travelogue | ✓ | ✗ | ✗ | ✗ |
| Pair TV | ✓ | ✓ | ✗ | ✗ |

### 5.4 Lucia setup checklist

- [ ] Drizzle adapter for `users` + `sessions`
- [ ] Password hash with `@node-rs/argon2` or `oslo/password`
- [ ] Email verification (Phase 2 — Resend)
- [ ] Rate limit sign-in: 10/min/IP (Fly edge or middleware)

---

## 6. Sync & offline model

### 6.1 LWW rules

- Each `trip` has `version` (integer, server increments on every write).
- Client sends `baseVersion` on update/delete.
- If `baseVersion !== server.version` → return `409`-style GraphQL error with current trip payload; client merges or prompts user.
- Deletes are **soft** (`deleted_at`); sync delta includes `DELETED` patches.

### 6.2 Client IndexedDB extensions

Add stores to existing `travelogueDb.ts`:

| Store | Purpose |
|-------|---------|
| `trips` | (existing) cached trip rows |
| `images` | (existing) blob cache keyed by server `imageId` |
| `sync_meta` | `{ travelogueId, serverVersion, lastSyncedAt }` |
| `outbox` | pending mutations `{ clientMutationId, type, payload, createdAt }` |

### 6.3 Online write path

```
User edits trip
  → optimistic React state update
  → if online: mutation immediately
  → on success: update local version, remove outbox entry
  → on failure (conflict): fetch trip, reconcile UI
```

### 6.4 Offline write path

```
User edits trip
  → optimistic React state + IndexedDB
  → append to outbox
  → on 'online' event: flushOutbox()
      → mutation pushChanges([...]) or individual mutations
      → apply SyncDelta
      → subscription catches anything missed
```

### 6.5 `pushChanges` batch mutation

Accepts ordered changes from outbox; idempotent via `clientMutationId` unique index. Returns full `SyncDelta` so client can reconcile in one round trip.

### 6.6 Subscription reconnect

On WS reconnect:

1. `syncDelta(travelogueId, sinceVersion: localMeta.serverVersion)`
2. Merge patches into state + IndexedDB
3. Re-subscribe `travelogueUpdated`

---

## 7. Image pipeline

### 7.1 Upload sequence

```
1. Client compresses (existing ImageCarousel logic, ~1200px, quality 0.82)
2. mutation requestImageUpload(tripId, mimeType, sizeBytes)
   → server validates quota (e.g. max 20 images/trip, 5MB each)
   → creates trip_images row (pending)
   → returns presigned PUT URL (15 min TTL)
3. Client PUT blob directly to R2
4. mutation attachImage(tripId, imageId)
   → server verifies object exists (HEAD request)
   → returns Trip with publicUrl in imageUrls
5. subscription emits UPDATED trip
6. TV loads image from CDN URL (not API)
```

### 7.2 R2 key layout

```
images/{travelogueId}/{tripId}/{imageId}.webp
```

Prefer **WebP** after client compression; accept JPEG/PNG and optionally transcode later.

### 7.3 CDN URL

```
https://cdn.ivchronicle.app/images/{travelogueId}/{tripId}/{imageId}.webp
```

Cloudflare CDN → R2 bucket with custom domain. Public read for authenticated URLs or signed cookies if you need private images.

**Cost control:** start with **public CDN URLs** (unguessable UUIDs); add signed URLs if needed.

### 7.4 Local image cache

`useTripImageUrls` hook:

1. Check IndexedDB blob by `imageId`
2. Else fetch CDN URL → store blob → object URL
3. Evict LRU when cache &gt; 200 MB (configurable)

---

## 8. TV pairing (QR) — optional living-room workflow

TV pairing connects a **display device** to an already-logged-in **phone or desktop editor**. It is not how users first set up the product — phone and desktop work fully on their own.

### 8.1 When to use pairing

| Scenario | Flow |
|----------|------|
| User on phone only | Normal app — no QR, no TV session |
| User on desktop only | Normal app — no QR |
| User on TV wants to edit chronicle/settings | TV shows QR → phone scans → phone edits → TV updates live |
| User on phone while TV is on | Optional: scan TV QR once per room/session to link display |

### 8.2 TV flow

1. User opens `https://app.ivchronicle.app/tv` on the TV → detected `data-platform="tv"`.
2. If no paired travelogue: show **Pair this TV** screen with QR and short code.
3. `mutation createTvSession` → display QR encoding:
   ```
   https://app.ivchronicle.app/pair?code=ABC12XY
   ```
4. Subscribe `tvSessionUpdated(sessionId)` waiting for `claimed: true`.
5. On claim: store device token + `travelogueId` in `localStorage` (`ivc-tv-session`).
6. Load travelogue in **display mode** + subscribe `travelogueUpdated`.
7. **Idle WS policy:** disconnect WS after 30 min no input; reconnect on keypress (screensaver already handles HUD).

TV UI in display mode: map, chronicle browse, trip card read-only, settings **hidden or read-only** (home city / map toggles edited from phone).

### 8.3 Phone flow (standalone + pairing)

**Standalone (default):**

1. User opens app on phone → `mobileLayout` bottom sheets.
2. Login → `/travelogues` → pick or create chronicle → `/t/:travelogueId`.
3. Full CRUD: trips, photos, import, travelogue settings — same server mutations as desktop.

**Pairing (when near a TV):**

1. User is already logged in on phone (standalone session).
2. Scan TV QR or open `/pair?code=ABC12XY`.
3. Confirm travelogue to show on TV (pre-filled if already viewing one) → `mutation claimTvSession(code, travelogueId)`.
4. Toast: “Living room TV connected.” Phone **stays in full standalone UI** — no mode switch to “remote only.”
5. Edits on phone propagate to TV via `travelogueUpdated`.

### 8.4 Client modes (not separate apps)

| Mode | Device | UI |
|------|--------|-----|
| `standalone` | Phone, desktop | Full editor — map, chronicle, trip dialog, settings, account |
| `display` | TV (paired) | Map + chronicle read-only; no trip create/edit; optional “Unpair” |
| `unpaired` | TV | QR pairing screen only |

Implement via route `/tv` for display and environment flags — **not** a separate phone binary or `/controller` route.

Phone never enters a degraded “controller-only” shell; pairing is session metadata (`pairedTvSessionId`) shown as a small banner, e.g. “Editing · Living room TV”.

### 8.5 Pairing code generation

- 7 chars, Crockford base32, exclude ambiguous chars.
- TTL: 10 minutes.
- Single use; cron or lazy delete expired rows.

---

## 9. Client integration plan

### 9.1 New dependencies (web)

```json
{
  "@apollo/client": "^3",
  "graphql": "^16",
  "graphql-ws": "^6",
  "react-router-dom": "^7"
}
```

### 9.2 Routes (single SPA, layout by platform)

| Route | Component | Auth | Phone | Desktop | TV |
|-------|-----------|------|-------|---------|-----|
| `/login` | LoginForm | public | ✓ | ✓ | — |
| `/signup` | SignUpForm | public | ✓ | ✓ | — |
| `/travelogues` | TravelogueListPage | required | ✓ | ✓ | — |
| `/t/:travelogueId` | TravelogueApp (map + chronicle) | required | ✓ full | ✓ full | — |
| `/pair` | PairTvPage | required | ✓ | ✓ optional | — |
| `/tv` | TvDisplayApp | device token | — | — | ✓ display |

There is **no** `/phone` or `/controller` route. Phone uses `/t/:id` with `mobileLayout` CSS (bottom sheets, thumb dock). TV uses `/tv` only.

**Default redirects:**

- Logged-in user on phone/desktop → last `travelogueId` or `/travelogues`
- TV detected at `/` → redirect to `/tv`
- Phone at `/` → redirect to `/travelogues` or last travelogue

### 9.3 Hook replacement

```typescript
// apps/web/src/hooks/useSyncedTravelogueStore.ts

export function useSyncedTravelogueStore(travelogueId: string) {
  // wraps useTravelogueStore behavior:
  // - initial load: Apollo query travelogue
  // - hydrate IndexedDB
  // - subscribe travelogueUpdated
  // - addTrip/updateTrip/removeTrip → mutations + outbox
  // - same return shape as useTravelogueStore for minimal App.tsx churn
}
```

### 9.4 Settings split

| Setting | Storage |
|---------|---------|
| `materialMode`, `tvInteraction`, `mobileLayout`, screensaver | localStorage (device) |
| `homeCityKey`, `map.*` | travelogue row on server |
| Active `travelogueId` | localStorage + URL param |

### 9.5 Files to touch (ordered)

1. `packages/shared/src/travelogue.ts` — extract types
2. `apps/api/*` — new server
3. `apps/web/src/lib/apollo.ts` — client setup
4. `apps/web/src/hooks/useSyncedTravelogueStore.ts`
5. `apps/web/src/db/travelogueDb.ts` — add sync_meta + outbox stores
6. `apps/web/src/App.tsx` — travelogueId from router
7. `apps/web/src/components/TravelogueListPage.tsx` — new
8. `apps/web/src/components/PairTvPage.tsx` — new
9. `apps/web/src/components/TvPairingScreen.tsx` — new
10. `apps/web/src/hooks/useTripImageUrls.ts` — CDN + cache

---

## 10. Implementation phases

### Phase 0 — Monorepo scaffold (2–3 days)

- [x] Yarn workspaces: `apps/web`, `apps/api`, `packages/shared`
- [x] Move existing Vite app to `apps/web`
- [x] Shared types package builds (`@ivc/shared`)
- [x] Root scripts: `yarn dev`, `yarn dev:api`, `yarn dev:web`
- [x] API scaffold: `GET /health`, `POST /graphql` stub

**Exit criteria:** `yarn dev:web` works identically to today. ✅

---

### Phase 1 — API + DB + auth (1–2 weeks)

- [x] Drizzle schema + migrations (`apps/api/drizzle/`)
- [x] Local Postgres via `docker-compose.yml`
- [x] Lucia auth: signUp, signIn, signOut, refreshAccessToken
- [x] GraphQL Yoga: `me`, `createTravelogue`, `travelogue` query
- [x] Trip CRUD mutations (no images yet)
- [x] Smoke test script (`yarn test:smoke`)

**Exit criteria:** Postman/GraphiQL or `yarn test:smoke` can manage trips. Requires `yarn db:up && yarn db:migrate`.

---

### Phase 2 — Web auth + travelogue management (1 week)

- [x] Login/signup pages
- [x] `/travelogues` list + create + delete
- [x] Route `/t/:id` loads server data into existing map UI (**phone + desktop** — mobile layout unchanged)
- [x] `useSyncedTravelogueStore` replaces local-only store when logged in
- [x] Guest mode: `/guest` uses IndexedDB offline fallback

**Exit criteria:** Logged-in user edits trips on **phone and desktop**; data persists after refresh. No TV required. ✅

---

### Phase 3 — Subscriptions + multi-device (3–5 days)

- [x] `graphql-ws` on API
- [x] `travelogueUpdated` subscription
- [x] `graphql-ws` client in web (live sync badge)
- [ ] Two browser tabs stay in sync (manual verify)

**Exit criteria:** Edit in tab A appears in tab B within 1s.

**Verify:** `yarn db:up && yarn db:migrate`, `yarn dev:api`, then `yarn test:subscription` or two tabs on `/t/:travelogueId`.

---

### Phase 4 — Images + R2 (1 week)

- [x] `requestImageUpload` / `attachImage` / `detachImage` mutations
- [x] R2 presigned PUT (or local dev storage at `/storage/put` + `/storage/media`)
- [x] Web upload pipeline wired through `useSyncedTravelogueStore`
- [x] IndexedDB cache by server image id + remote URL fetch
- [ ] R2 bucket + CDN domain (production — configure env vars)

**Exit criteria:** Photo uploaded on phone appears on second device.

**Verify:** `yarn dev:api` then `yarn test:image`. Two tabs on same trip should show photos after attach (subscription `UPDATED`).

---

### Phase 5 — Offline sync (1–2 weeks)

- [x] IndexedDB outbox + sync_meta stores (`ivc-sync` DB)
- [x] `pushChanges` + `syncDelta` GraphQL
- [x] Online/offline detector + flush on reconnect
- [x] Conflict UI (server wins + dismissible toast)

**Exit criteria:** Airplane mode edits sync when back online.

**Verify:** `yarn test:push`; in browser DevTools → Network → Offline, edit a trip, go Online → badge shows `Sync (n)` then clears.

---

### Phase 6 — TV pairing (1 week)

- [x] `tv_sessions` + `createTvSession` / `claimTvSession` / `unpairTvSession`
- [x] `tvSessionUpdated` subscription (device token delivered to TV subscriber)
- [x] QR pairing screen on `/tv`
- [x] `/pair` page on phone (and desktop) — standalone phone UX unchanged
- [x] TV display mode: read-only map + chronicle via device JWT
- [ ] WS idle disconnect policy (30 min) — optional follow-up

**Exit criteria:** Phone edits chronicle in normal standalone UI; paired TV updates live. Phone works fully with TV off.

**Verify:** `yarn test:tv`; open `/tv` on a wide display, `/pair?code=…` on phone while logged in.

---

### Phase 7 — Production hardening (ongoing)

- [x] Email verification hook (Resend optional; dev logs link)
- [x] Rate limiting (in-memory per IP; Fly/Redis later)
- [ ] Sentry error tracking
- [ ] Upstash Redis when running 2+ Fly machines
- [ ] Database backups verified
- [x] Import migration: `importChronicle` from existing JSON export
- [x] TV WebSocket idle disconnect (30 min)

---

## 11. Infrastructure setup guide

This section is the step-by-step account and cloud setup.

### 11.1 Accounts to create

Create these in order:

| # | Service | URL | Purpose | Cost |
|---|---------|-----|---------|------|
| 1 | **GitHub** | github.com | Repo (existing) | Free |
| 2 | **Cloudflare** | dash.cloudflare.com | DNS, R2, Pages, CDN | Free tier |
| 3 | **Neon** | neon.tech | Postgres | Free tier |
| 4 | **Fly.io** | fly.io | API + WebSocket host | ~$5/mo |
| 5 | **Upstash** | upstash.com | Redis (Phase 7) | Free tier |
| 6 | **Resend** | resend.com | Transactional email (Phase 7) | Free tier |

Optional later: custom domain registrar (Porkbun, Namecheap, Cloudflare Registrar).

---

### 11.2 Domain & Cloudflare (do this first)

#### Step 1 — Add site to Cloudflare

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Add a site** → enter your domain (e.g. `ivchronicle.app`).
3. Cloudflare scans DNS; select **Free** plan.
4. Update nameservers at your registrar to Cloudflare's NS records.
5. Wait for status **Active**.

#### Step 2 — DNS records (after you know Fly IPs)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `app` | `<pages>.pages.dev` | Proxied |
| CNAME | `api` | `<app-name>.fly.dev` | Proxied |
| CNAME | `cdn` | R2 custom domain (see 11.4) | Proxied |

Enable **SSL/TLS → Full (strict)** once origin certs are configured.

---

### 11.3 Neon Postgres

#### Step 1 — Create project

1. Go to [console.neon.tech](https://console.neon.tech).
2. **New Project** → name: `interactive-vacations-chronicle`.
3. Region: choose closest to Fly region (e.g. `us-east-1` if Fly is `iad`).
4. Postgres version: **16**.

#### Step 2 — Branches

1. Default branch `main` → production.
2. **Create branch** `dev` from `main` → staging/local shared DB.

#### Step 3 — Connection strings

In Neon dashboard → **Connection details**:

```
# Pooled (use for API — supports many connections)
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Direct (use for migrations only)
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&direct=true
```

Save as:

- Fly secret: `DATABASE_URL` (pooled)
- Local `.env`: `DATABASE_URL_DIRECT` for `drizzle-kit migrate`

#### Step 4 — Run migrations

```bash
cd apps/api
cp .env.example .env
# fill DATABASE_URL_DIRECT
yarn drizzle-kit generate
yarn drizzle-kit migrate
```

#### Step 5 — Neon free tier limits (watch these)

- 0.5 GB storage
- Compute autosuspend after idle
- If API latency spikes on cold start, upgrade to Launch (~$19/mo) or disable autosuspend

---

### 11.4 Cloudflare R2 (images)

#### Step 1 — Create bucket

1. Cloudflare dashboard → **R2** → **Create bucket**.
2. Name: `ivc-images`.
3. Location: Automatic.

#### Step 2 — API tokens for S3-compatible access

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Permissions: **Object Read & Write** on `ivc-images`.
3. Save:
   - Access Key ID
   - Secret Access Key
   - Endpoint: `https://<account_id>.r2.cloudflarestorage.com`

#### Step 3 — Custom domain for CDN

1. R2 bucket → **Settings** → **Custom Domains** → **Connect Domain**.
2. Enter: `cdn.ivchronicle.app`.
3. Cloudflare creates DNS automatically (proxied).

#### Step 4 — CORS (for browser presigned PUT)

In bucket settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://app.ivchronicle.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Step 5 — Public access vs signed

**Start simple:** public read via CDN (URLs contain UUIDs).  
Write always via presigned PUT (short TTL).

---

### 11.5 Fly.io (API + WebSocket)

#### Step 1 — Install CLI & auth

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup   # or fly auth login
```

#### Step 2 — Create app

```bash
cd apps/api
fly launch --no-deploy
```

Prompts:

- App name: `ivc-api`
- Region: `iad` (or nearest to Neon)
- Do not add Postgres (using Neon)
- Create `fly.toml`

#### Step 3 — `fly.toml` essentials

```toml
app = "ivc-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = false   # keep WS alive; or true + min 1 machine
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health"
    timeout = "5s"
```

WebSocket note: Fly supports WS on the same HTTP service — no extra config.

#### Step 4 — Dockerfile

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace @ivc/shared build
RUN yarn workspace @ivc/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
```

#### Step 5 — Secrets

```bash
fly secrets set \
  DATABASE_URL="postgresql://..." \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com" \
  R2_BUCKET="ivc-images" \
  R2_PUBLIC_BASE_URL="https://cdn.ivchronicle.app" \
  CORS_ORIGIN="https://app.ivchronicle.app" \
  --app ivc-api
```

#### Step 6 — Deploy

```bash
fly deploy --app ivc-api
fly certs add api.ivchronicle.app
```

Verify:

```bash
curl https://api.ivchronicle.app/health
# → { "ok": true }
```

#### Step 7 — Fly pricing knobs

| Setting | Hobby | Notes |
|---------|-------|-------|
| `shared-cpu-1x` 256MB | ~$3–5/mo | Start here |
| `min_machines_running = 1` | required for reliable WS | |
| Scale to 2 machines | +Redis pub/sub | Phase 7 |

---

### 11.6 Cloudflare Pages (web client)

#### Step 1 — Connect repo

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → Connect GitHub.
2. Select repo `interactive-vacations-chronicle`.
3. Build settings:

| Setting | Value |
|---------|-------|
| Root directory | `apps/web` |
| Build command | `yarn install && yarn build` |
| Output directory | `dist` |
| Node version | 22 |

#### Step 2 — Environment variables (Pages)

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://api.ivchronicle.app/graphql` |
| `VITE_WS_URL` | `wss://api.ivchronicle.app/graphql` |
| `VITE_CDN_URL` | `https://cdn.ivchronicle.app` |

#### Step 3 — Custom domain

Pages project → **Custom domains** → `app.ivchronicle.app`.

#### Step 4 — SPA routing

Add `apps/web/public/_redirects`:

```
/*    /index.html   200
```

Or Cloudflare Pages **Redirects** rule: `/* → /index.html` (200).

---

### 11.7 Upstash Redis (when needed)

Trigger: **2+ Fly API instances** or missed subscription events.

1. [console.upstash.com](https://console.upstash.com) → **Create database**.
2. Type: Regional, region matches Fly.
3. Copy `UPSTASH_REDIS_REST_URL` and token.
4. Implement `RedisPubSub` adapter implementing same interface as in-memory pub/sub.
5. `fly secrets set REDIS_URL=...`

Free tier: 10k commands/day — enough for beta.

---

### 11.8 Resend (email, Phase 7)

1. [resend.com](https://resend.com) → verify domain `ivchronicle.app` (DNS TXT records in Cloudflare).
2. API key → Fly secret `RESEND_API_KEY`.
3. Send verification emails on signUp.

---

### 11.9 Cloud structure summary

```
Cloudflare Account
├── Zone: ivchronicle.app
│   ├── DNS
│   │   ├── app.ivchronicle.app  → Pages
│   │   ├── api.ivchronicle.app  → Fly.io
│   │   └── cdn.ivchronicle.app  → R2
│   ├── Pages: ivc-web
│   └── R2: ivc-images
│
Neon Account
└── Project: interactive-vacations-chronicle
    ├── branch main (prod)
    └── branch dev

Fly.io Account
└── App: ivc-api (iad)

Upstash (later)
└── Redis: ivc-pubsub
```

---

## 12. Environment variables reference

### API (`apps/api/.env`)

```bash
# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database (Neon)
DATABASE_URL=postgresql://...?sslmode=require
DATABASE_URL_DIRECT=postgresql://...?sslmode=require&direct=true

# Auth
SESSION_SECRET=dev-session-secret-min-32-chars
JWT_SECRET=dev-jwt-secret-min-32-chars
JWT_ACCESS_TTL_SECONDS=900
SESSION_COOKIE_NAME=ivc_session

# R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET=ivc-images
R2_PUBLIC_BASE_URL=http://localhost:8787  # or CDN URL

# Redis (optional)
REDIS_URL=

# Email (optional)
RESEND_API_KEY=
EMAIL_FROM=noreply@ivchronicle.app
```

### Web (`apps/web/.env`)

```bash
VITE_API_URL=http://localhost:4000/graphql
VITE_WS_URL=ws://localhost:4000/graphql
VITE_CDN_URL=http://localhost:8787
```

---

## 13. Local development

### 13.1 Prerequisites

- Node 22+
- Yarn 4 or pnpm 9
- Fly CLI (deploy only)
- Optional: Docker for local Postgres instead of Neon dev branch

### 13.2 Day-one local stack

```bash
# Terminal 1 — API
cd apps/api
cp .env.example .env
yarn dev          # nodemon tsx src/index.ts

# Terminal 2 — Web
cd apps/web
cp .env.example .env
yarn dev          # vite --host

# Terminal 3 — DB migrations
cd apps/api
yarn drizzle-kit migrate
```

### 13.3 Local R2 alternative

Use **MinIO** in Docker for S3-compatible local dev:

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio12345 \
  minio/minio server /data --console-address ":9001"
```

Set `R2_ENDPOINT=http://localhost:9000` and create bucket `ivc-images`.

### 13.4 GraphiQL

Yoga serves GraphiQL at `http://localhost:4000/graphql` in development.

---

## 14. Deployment & CI/CD

Implemented in the repo:

| Workflow | File |
|----------|------|
| Web (GitHub Pages) | `.github/workflows/deploy-pages.yml` |
| API (migrate + Fly) | `.github/workflows/deploy-api.yml` |

API container: `apps/api/Dockerfile`, `apps/api/fly.toml` (build context = monorepo root).

### 14.1 GitHub Actions — API deploy

On push to `main` (API/shared paths): **migrate** with `DATABASE_URL_DIRECT` → **deploy** with `FLY_API_TOKEN`.

Generate token: `fly tokens create deploy -x 999999h` → GitHub secret `FLY_API_TOKEN`.

First deploy still requires `fly launch --no-deploy` and `fly secrets set` locally (see README **Production setup**).

### 14.2 Pages deploy

`.github/workflows/deploy-pages.yml` builds on `main` with repo variables `VITE_API_URL`, `VITE_WS_URL`, `VITE_CDN_URL`.

Alternatively use Cloudflare Pages (§11.6) connected to the same repo — no change to the API workflow.

### 14.3 Migrations in CI

The `migrate` job in `deploy-api.yml` runs `yarn db:migrate` in `apps/api` with `DATABASE_URL_DIRECT` (falls back in `drizzle.config.ts` to `DATABASE_URL` for local use).

Run migrations from CI or locally before deploy — **never** auto-migrate on server boot in production.

---

## 15. Production checklist

### Security

- [ ] `SESSION_SECRET` and `JWT_SECRET` are 32+ random bytes (not dev defaults)
- [ ] HttpOnly, Secure, SameSite=Lax cookies
- [ ] CORS locked to `https://app.ivchronicle.app`
- [ ] Rate limit `/auth` and `signIn` mutation
- [ ] Presigned upload TTL ≤ 15 min; validate `sizeBytes` server-side
- [ ] TV pairing codes expire in 10 min

### Reliability

- [ ] `/health` returns DB connectivity status
- [ ] Fly health checks configured
- [ ] Neon backups enabled (default on paid; verify on free)
- [ ] WS reconnect + syncDelta on client

### Observability

- [ ] Structured JSON logs on Fly (`fly logs`)
- [ ] Sentry DSN in API + web (optional)
- [ ] Uptime check on `api.ivchronicle.app/health` (Better Stack free tier)

### Performance

- [ ] Neon pooled connection string in API
- [ ] Drizzle connection pool max ~10 on single Fly instance
- [ ] TV WS idle disconnect after 30 min
- [ ] Image client compression before upload

---

## 16. Cost & scaling triggers

| Trigger | Action |
|---------|--------|
| Neon cold starts &gt; 500ms | Upgrade Neon or keep-alive ping |
| Fly CPU &gt; 70% sustained | Scale to `shared-cpu-2x` or 2 machines + Redis |
| R2 &gt; 10 GB | Review image caps; add thumbnail-only for TV |
| WS connections &gt; 500 | Redis pub/sub + 2+ API instances |
| 100k+ API req/day | Review Fly machine count |
| Need co-editing | Consider OT layer (not LWW) |

**Expected monthly (family beta):** $5–25 total.

---

## Appendix A — Mapping from current codebase

| Current file | Server-era role |
|--------------|-----------------|
| `src/types/travelogue.ts` | → `packages/shared` |
| `src/hooks/useTravelogueStore.ts` | → `useSyncedTravelogueStore` |
| `src/db/travelogueDb.ts` | Offline cache + outbox |
| `src/db/tripImages.ts` | CDN fetch + local blob cache |
| `src/utils/chronicleTransfer.ts` | `importChronicle` mutation + backup export |
| `src/hooks/useAppSettings.ts` | Split device vs travelogue settings |
| `src/context/TvFocusContext.tsx` | Unchanged; TV display mode |
| `src/components/ChronicleTransfer.tsx` | Backup import/export UI |

---

## Appendix B — First implementation ticket list

Copy into GitHub Issues as Epic **Server Stack MVP**:

1. Monorepo scaffold + shared types
2. Drizzle schema + Neon dev branch
3. Lucia auth endpoints
4. GraphQL trip CRUD
5. Fly.io deploy + health check
6. Web login + travelogue list
7. Wire map app to server travelogue
8. GraphQL subscriptions
9. R2 presigned uploads
10. Offline outbox + syncDelta
11. TV pairing flow
12. Production secrets + custom domains

---

*Last updated: 2026-06-02*
