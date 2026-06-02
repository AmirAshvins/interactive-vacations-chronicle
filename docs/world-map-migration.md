# World map migration — geo-accurate SVG, same vibe

## Goal

Replace `public/world-map.svg` (illustrative, non-geographic) with a **georeferenced** world map so WGS84 pins and flight arcs land on the right countries — **without** changing how the app looks, feels, or behaves.

This is an **asset + projection** swap, not a UI redesign.

---

## What defines the current vibe (must preserve)

| Element | How it works today | Migration rule |
|--------|---------------------|----------------|
| **Floating map on black wall** | No ocean fill in SVG; `body` / map stage background shows through gaps | New SVG: **no ocean rectangle**; only country paths |
| **Wood / cork / walnut land** | `currentColor` on `.world-map-svg.material-{oak,cork,walnut}` → `#world-map path.landmass { fill: currentColor }` | No hard `fill`/`stroke` in SVG; paths use `class="landmass"` only |
| **Soft coastlines** | `--landmass-stroke` + thin stroke, `paint-order: stroke fill` | Keep CSS vars; tune stroke after visual QA if coasts look too busy |
| **Study shadow** | `.world-map-svg { filter: drop-shadow(...) }` tied to solar clock | Unchanged CSS; same filter on `#world-map` root |
| **Night spotlight** | `.spotlight-overlay` on `.map-stage` | Unchanged |
| **Hover** | `hovered-country` → brass tint `#b59563` | Same class on paths/groups |
| **Visited countries** | `visited-country` → `#a58452` (day) / `#c9a04a` (night) | Same classes |
| **Layout footprint** | `.map-aspect-box` aspect ratio **784.077 / 458.627** | Keep same viewBox size **or** update `mapViewBox.ts` + `aspect-ratio` together in one PR |
| **Simplified shapes** | Chunky, low-detail friendly silhouettes | Simplify topology in build (Mapshaper ~2–5%); avoid hyper-detailed coasts |
| **Pins & arcs** | Separate SVG layers, same `viewBox`, `preserveAspectRatio="xMidYMid meet"` | Same three-layer stack in `WorldMap.tsx` |

If the new map passes the **SVG contract** below and a **side-by-side screenshot** with oak material + a few pins, the UI should read as the same product.

---

## SVG contract (do not break)

The React map loader expects this structure (`WorldMap.tsx`):

```xml
<svg id="world-map" viewBox="…" class="world-map-svg material-oak">
  <g>
    <!-- Single-path country -->
    <path id="ca" class="landmass" d="…" />
    <!-- Multi-path country (e.g. US, Indonesia, islands) -->
    <g id="us">
      <path class="landmass" d="…" />
      <path class="landmass" d="…" />
    </g>
  </g>
</svg>
```

### Required

1. Root element **`id="world-map"`** (loader queries `#world-map > g`).
2. One **direct child `<g>`** containing all countries (sibling order not important).
3. Each country: **`<path id="{iso2}">`** or **`<g id="{iso2}">`** with one or more paths inside.
4. **`id`** = lowercase **ISO 3166-1 alpha-2** (`ca`, `fr`, `de`, …) — same as today and `worldCities` / trip `countryCode`.
5. Every land path has **`class="landmass"`** (and optional `mainland` for extras — harmless).
6. **No** inline `fill`, `stroke`, or `style` on paths (CSS owns appearance).
7. **Special case:** keep **`_somaliland`** if we still support Hargeisa in `worldCities` (pinned city); otherwise map as `so` and migrate data once.

### Parser behaviour (unchanged)

- `path` → one hit target, hover on that path.
- `g` → group hover, all child paths get `landmass` + state classes.
- `onCountriesLoaded(ids)` → drives Trip dialog country list, home city picker, visited highlighting.

Any new country IDs require running `node scripts/generate-world-cities.mjs` so city search stays in sync.

---

## Projection after migration

**Single formula** in `mapProjection.ts` (remove hybrid Y-fit, country deltas, and most pin nudges):

```ts
// viewBox: width W, height H (e.g. 784.077 × 458.627)
x = ((lng + 180) / 360) * W + minX;
y = ((90 - lat) / 180) * H + minY;
```

Inverse for pin drag uses the same math. Lat/lng in IndexedDB stay WGS84; only screen placement improves.

Recommended viewBox: **`0 0 784.077 458.627`** (clean origin) and update `src/utils/mapViewBox.ts` — aspect-ratio CSS already uses those numbers.

---

## Recommended source & build pipeline

### Source

**Natural Earth Admin 0 – Countries** (110m for web weight, 50m if we want slightly richer coasts)  
or **world-atlas** `countries-110m.json` (TopoJSON → GeoJSON in script).

License: public domain (Natural Earth). Document attribution in SVG `<desc>` if required.

### Build script: `scripts/build-world-map-svg.mjs`

| Step | Action |
|------|--------|
| 1 | Load country geometries |
| 2 | Reproject to **equirectangular plate carrée** on fixed canvas (784×458 or 360×180 scaled to fit) |
| 3 | **Simplify** topology (Mapshaper Visvalingam / dp) until file ~300–500 KB and silhouettes feel “poster simple” |
| 4 | Emit paths with ISO2 `id`, `class="landmass"` |
| 5 | Merge split polygons per country into one `<g id="xx">` when needed |
| 6 | Validate: every `id` unique, all paths have `landmass`, no fills |
| 7 | Write `public/world-map.svg` + snapshot `public/world-map-legacy.svg` (current file) |

Optional dev dependency: `d3-geo`, `topojson-client`, or call `mapshaper` CLI from the script.

### Simplification tuning (aesthetic)

- **Too much detail** → noisy coasts, loses calm “study map” feel.
- **Too aggressive** → missing small countries (Baltics, Caribbean) — breaks visited/hover.
- Target: visually similar **weight** to current map (bold, readable at phone/TV distance).

Keep a **tuning knob** in the script (e.g. `SIMPLIFY_PERCENT`) and iterate with screenshots in oak + walnut + dark phase.

---

## Code changes (minimal surface)

| File | Change |
|------|--------|
| `public/world-map.svg` | New asset from build script |
| `src/utils/mapViewBox.ts` | Match new `viewBox` |
| `src/utils/mapProjection.ts` | True equirectangular only; delete delta/IDW code |
| `src/data/mapPinNudges.ts` | Remove or reduce to ~0 entries after QA |
| `src/utils/buildCountryProjectionDeltas.ts` | Delete (obsolete) |
| `src/data/countryGeoCenters.ts` | Delete (obsolete) |
| `scripts/generate-world-cities.mjs` | Re-run after SVG ids change |
| `WorldMap.tsx` | **No structural changes** if contract holds |
| `index.css` / `solarTheme.ts` | **No changes** unless coast stroke needs 1px tweak |

Feature flag (optional): `VITE_MAP_GEO=1` → load `world-map.svg` vs `world-map-legacy.svg` for A/B during QA.

---

## Functionality checklist (regression)

- [ ] Country hover + tooltip name (`getCountryName`)
- [ ] Visited country highlight (`highlightVisited`)
- [ ] Material modes: oak / cork / walnut / auto (solar)
- [ ] Solar dark phase land + visited colours
- [ ] Pan / zoom / pinch (`mapGestures`)
- [ ] Pin click, open card, drag to set lat/lng (unproject)
- [ ] Flight arcs from home; dense mode when many trips
- [ ] TV focus on map pins (not countries)
- [ ] Mobile sheet map offset (`environments.css`)
- [ ] Trip dialog / home city / country dropdown country list
- [ ] Chronicle template import (Bedrood Azizi) — pins on land
- [ ] Export/import JSON unchanged

---

## Visual QA gate (before merge)

Capture **same** screenshots for legacy vs geo map:

1. Day + oak — full world, Europe inset, Americas inset  
2. Night + walnut — spotlight visible  
3. Visited countries ON — brass fill distinct  
4. Hover France — hover brass  
5. Bedrood Azizi template — Toronto hub + arcs (dense layer)  
6. Open trip card over map — no layout shift  

**Pass criteria:** A user should say “same app, pins line up better” — not “new map style.”

Spot cities: Toronto, Vancouver, London, Paris, Rome, Dubai, Singapore, Sydney, Easter Island, Reykjavik, Cartagena.

---

## Phased rollout

### Phase A — Asset only (behind flag)

- Build script + new SVG  
- Flag toggles asset; projection still hybrid on legacy, equirectangular on geo (or always equirectangular when geo asset active)  
- Internal QA

### Phase B — Default geo map

- Flip default to new SVG  
- Remove hybrid projection + calibration dead code  
- Keep `world-map-legacy.svg` one release for rollback  

### Phase C — Polish

- Stroke/simplify tweak only if QA asks  
- Remove flag  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| New coasts look “GIS sharp” vs soft poster | Aggressive simplify + same stroke CSS; optional slight stroke-width bump |
| Missing micro-states | Minimum area threshold; manual add paths for `sg`, `mc`, etc. if dropped |
| `us` / `ru` / `ca` multi-polygon | Keep `<g id="us">` pattern; group-level hover |
| Aspect ratio change | Lock output viewBox to current W×H |
| `_somaliland` | Keep custom id or reassign trips to `so` |
| File size | 110m + simplify; target &lt; 500 KB gzip-friendly |

---

## What we are **not** doing

- Switching to Mapbox/Leaflet (different interaction model, licensing, vibe)  
- Changing pin/flight/card UI  
- Requiring users to re-import chronicles (coords unchanged)  
- Per-city manual nudges as the long-term fix  

---

## Effort (revised)

| Phase | Work | ~Time |
|-------|------|-------|
| A | Build script + simplify tuning + SVG contract tests | 6–10 h |
| B | Projection cleanup + flag + QA screenshots | 2–4 h |
| C | Remove legacy + dead code | 1–2 h |

---

## Success statement

> **Geo-accurate lat/lng on a map that still looks like our cork study board — same colours, shadow, hover, visited states, pan/zoom, and flight lines — with pins sitting on the right countries.**

### Implemented

- `yarn build:map` → `public/world-map.svg` (Natural Earth 110m, equirectangular)
- `public/world-map-legacy.svg` — rollback art map
- Geo projection in `src/utils/mapProjection.ts`
- Default: geo map. Compare old art: `VITE_MAP_LEGACY=true yarn dev`
