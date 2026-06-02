# World map migration plan

## Problem

The bundled map (`public/world-map.svg`, Al MacDonald “Simple World Map”) is **illustrative**, not georeferenced. Trip pins use real WGS84 lat/lng. Any projection is an approximation; country-level SVG calibration made placement worse because:

- Country bounding-box centers ≠ city locations.
- The artwork distorts regions non-uniformly.

**Correct fix:** use a map whose SVG coordinates follow a known projection (plate carrée / equirectangular).

## Requirements to preserve

| Feature | Depends on |
|--------|------------|
| Country hover + tooltip | `id` on each country path/group (ISO 3166-1 alpha-2, e.g. `ca`, `fr`) |
| Visited highlighting | `.landmass` + `.visited-country` on paths |
| Material / solar styling | `#world-map path.landmass`, `.world-map-svg` drop-shadow |
| TV / pointer hit targets | Same SVG structure in DOM |
| Pin + flight layers | Shared `viewBox` with map |
| `worldCities` / templates | Unchanged (WGS84) |

## Recommended target

**Natural Earth – world map at 110m, equirectangular WGS84**, simplified for web:

1. Source: [Natural Earth](https://www.naturalearthdata.com/) Admin 0 countries (110m or 50m).
2. Reproject to **EPSG:4326 plate carrée** with a fixed canvas, e.g. `viewBox="0 0 360 180"` where `x = lng + 180`, `y = 90 - lat`.
3. Simplify topology (mapshaper) to keep file size &lt; 500KB if possible.
4. Set each country path `id` to ISO2 (match current app: lowercase `ca`, `de`, …).
5. Re-style paths to match current aesthetic (fill via CSS classes, no hard fills in SVG).

Alternative: generate from **world-atlas** (`topojson`) + `d3-geo` `geoEquirectangular` in a build script — same result, easier to regenerate.

## Projection after migration

Replace hybrid Y-fit in `mapProjection.ts` with true equirectangular:

```ts
x = ((lng + 180) / 360) * width + minX;
y = ((90 - lat) / 180) * height + minY;
```

Pin nudges (`mapPinNudges.ts`) should shrink to edge cases only.

## Migration steps

### Phase 1 — Asset pipeline

1. Add `scripts/build-world-map-svg.mjs`:
   - Input: Natural Earth GeoJSON or world-atlas `countries-110m.json`.
   - Output: `public/world-map.svg` (or `world-map-v2.svg` behind a flag).
   - Enforce ISO2 ids; document any custom ids (`_somaliland` if needed).
2. Record `MAP_VIEWBOX` in `src/utils/mapViewBox.ts` from output.
3. Visual diff against old map (screenshot test).

### Phase 2 — Code switch

1. Point `WORLD_MAP_SVG_URL` at new file.
2. Simplify `projectCoordinates` / `unprojectCoordinates` (remove country deltas).
3. Remove `buildCountryProjectionDeltas.ts` and `countryGeoCenters.ts` when unused.
4. Run `scripts/generate-world-cities.mjs` if country list in SVG changed.

### Phase 3 — Styling parity

1. Map `.landmass` fills to wood/solar tokens (already CSS-driven).
2. Tune drop-shadow / stroke to match current “study” look.
3. Verify dark phase + visited countries + TV focus.

### Phase 4 — QA

- Spot-check Bedrood Azizi template cities (Toronto, Paris, Tokyo, Easter Island, etc.).
- Drag pin → lat/lng updates still correct.
- Chronicle export/import unchanged.
- Mobile / TV gestures unchanged.

## Rollout

- Ship behind `VITE_MAP_GEO=true` for one release, then remove flag.
- Keep old SVG as `world-map-legacy.svg` until QA passes.

## Effort estimate

| Task | ~Time |
|------|--------|
| Build script + SVG | 4–8 h |
| Projection simplification | 1–2 h |
| Styling + QA | 2–4 h |

## Current mitigation (until migration)

- Base equirectangular + fitted-Y on artistic map (no country delta).
- Thin, low-opacity flight arcs when &gt;36 routes (`flight-layer--dense`).
- Optional per-city nudges in `src/data/mapPinNudges.ts`.
