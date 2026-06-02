# Interactive Vacations Chronicle

An interactive world-map travel chronicle — journal entries, flight arcs, photos, and a solar-driven day/night presentation. Built as a **first-class experience on phone, desktop, and TV**.

GitHub repo: `interactive-vacations-chronicle`

## Platforms

| Platform | Role |
|----------|------|
| **Phone** | Full standalone app — map, chronicle editing, trip photos, settings, account, travelogue management. Works without a TV. |
| **Desktop** | Same feature set as phone with the reference inset-map layout. |
| **TV** | Living-room **display** — map, chronicle browse, screensaver. Editing is awkward on a remote; scan the on-screen **QR code** with your phone to manage chronicles and settings while the TV updates live. |

Phone is not a “companion only” client. QR pairing is an optional workflow when a TV is in the room, not a requirement to use the product.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- IndexedDB (`idb`) for trips and images (offline cache today; server sync planned)
- Natural Earth 110m countries → `public/world-map.svg`

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Web dev server (alias for `dev:web`) |
| `yarn dev:web` | Web app only |
| `yarn dev:api` | GraphQL API + WebSocket subscriptions (port 4000) |
| `yarn db:up` | Start local Postgres (Docker) |
| `yarn db:migrate` | Apply Drizzle migrations |
| `yarn test:smoke` | API integration smoke test (API must be running) |
| `yarn test:subscription` | WebSocket `travelogueUpdated` smoke test (API must be running) |
| `yarn build` | Production build |
| `yarn preview` | Preview production build |
| `yarn lint` | ESLint |
| `yarn build:map` | Regenerate `public/world-map.svg` from Natural Earth GeoJSON |

## Project layout

```
apps/
  web/            Vite + React client (map, chronicle, TV/mobile UX)
  api/            GraphQL API scaffold (Phase 1+)
packages/
  shared/         Trip / travelogue / sync types (@ivc/shared)
scripts/
  build-world-map-svg.mjs
docs/
  ENVIRONMENT_UX.md
  SERVER_STACK_PLAN.md
```

## Chronicle templates

Sample family routes live under `src/data/chronicleTemplates/`. Import from the Chronicle panel in the app.

## TV + phone workflow

1. Open the app on TV — map and chronicle in display mode (D-pad / remote navigation).
2. To add trips, edit entries, or change travelogue settings, scan the TV’s QR code with your phone (logged in).
3. Changes on the phone sync to the server and appear on the TV via realtime subscriptions.

Without a TV, use the phone or desktop app directly for everything.

See [docs/ENVIRONMENT_UX.md](docs/ENVIRONMENT_UX.md) for layout and interaction details, and [docs/SERVER_STACK_PLAN.md](docs/SERVER_STACK_PLAN.md) for the backend implementation plan.

### API (Phase 1 — local)

```bash
cp apps/api/.env.example apps/api/.env   # edit secrets if needed
yarn db:up                              # Docker Postgres
yarn db:migrate
yarn dev:api                            # http://localhost:4000/graphql (GraphiQL in dev)
```

### Web + API (Phase 2 — local)

```bash
# Terminal 1 — API (see above)
yarn dev:api

# Terminal 2 — web
cp apps/web/.env.example apps/web/.env
yarn dev:web                            # http://localhost:5173
```

Sign up at `/signup`, create a travelogue, open the map at `/t/:id`. Offline-only: `/guest`.

### Live sync (Phase 3)

Trip create/update/delete mutations publish `travelogueUpdated` over `graphql-ws` on the same `/graphql` path. The web client subscribes while viewing a travelogue (green **Live** badge when connected).

```bash
yarn test:subscription   # with yarn dev:api running
```

Open the same `/t/:id` in two tabs; edits in one tab should appear in the other within about a second.

### Images (Phase 4)

Trip photos upload via presigned PUT (Cloudflare R2 in production, local disk in dev). The API serves dev files at `http://localhost:4000/storage/media/...`.

```bash
yarn test:image   # with yarn dev:api running
```

Set `R2_*` and `STORAGE_PUBLIC_BASE_URL` in `apps/api/.env` for production. Without R2 vars, uploads use `.data/ivc-uploads` automatically.

### Offline sync (Phase 5)

Synced travelogues queue trip edits in IndexedDB when offline and flush via `pushChanges` when back online. The map shows **Offline**, **Sync (n)**, or **Live** in the top-right.

```bash
yarn test:push   # API pushChanges + syncDelta smoke test
```

### TV pairing (Phase 6)

Living-room display at `/tv` — scan the QR (or open `/pair?code=…` on phone while logged in). Phone keeps the full editor; the TV follows via `travelogueUpdated`.

```bash
yarn test:tv     # createTvSession → claimTvSession → travelogue query with device token
```

Set `PUBLIC_APP_ORIGIN` in `apps/api/.env` so pairing URLs point at your web app (default `http://localhost:5173`).
