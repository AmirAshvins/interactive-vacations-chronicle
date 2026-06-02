# Bedrood Azizi Travelogue

A family travel chronicle on an interactive world map — journal entries, flight arcs, photos, and a solar-driven day/night presentation. Built for desktop, mobile, and TV (remote / D-pad).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- IndexedDB (`idb`) for trips and images
- Natural Earth 110m countries → `public/world-map.svg`

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Development server |
| `yarn build` | Production build |
| `yarn preview` | Preview production build |
| `yarn lint` | ESLint |
| `yarn build:map` | Regenerate `public/world-map.svg` from Natural Earth GeoJSON |

## Project layout

```
src/
  components/     UI (map, panels, chronicle, trip cards)
  context/        TV focus + environment detection
  data/           world cities + chronicle templates
  db/             IndexedDB persistence
  hooks/          Store, settings, environment
  utils/          Map projection, flights, import/export
public/
  world-map.svg   Georeferenced country map
scripts/
  build-world-map-svg.mjs
docs/
  ENVIRONMENT_UX.md   Mobile / TV / desktop behavior
```

## Chronicle templates

Bedrood Azizi routes live under `src/data/chronicleTemplates/`. Import from the Chronicle panel in the app.

## TV mode

Enable **TV interaction** in Settings for remote navigation, map pan/zoom controls, and the on-screen focus debug bar.

See [docs/ENVIRONMENT_UX.md](docs/ENVIRONMENT_UX.md) for layout and interaction details.
