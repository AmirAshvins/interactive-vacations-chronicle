/**
 * Builds public/world-map.svg — georeferenced equirectangular countries for the travelogue map.
 * Run: node scripts/build-world-map-svg.mjs
 *
 * Source: Natural Earth 110m Admin 0 countries (public domain)
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'public/world-map.svg');
const LEGACY_PATH = join(ROOT, 'public/world-map-legacy.svg');

const VIEWBOX = { width: 784.077, height: 458.627, minX: 0, minY: 0 };
const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

/** Excluded from SVG — AQ wraps the lower edge and breaks fill; not needed for travelogue */
const EXCLUDE_ISO2 = new Set(['aq']);

function project(lat, lng) {
  const { width, height, minX, minY } = VIEWBOX;
  return {
    x: ((lng + 180) / 360) * width + minX,
    y: ((90 - lat) / 180) * height + minY,
  };
}

function ringToD(ring) {
  if (!ring.length) return '';
  const parts = ring.map(([lng, lat], i) => {
    const { x, y } = project(lat, lng);
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd}${x.toFixed(2)},${y.toFixed(2)}`;
  });
  parts.push('Z');
  return parts.join('');
}

function geometryToPathDs(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    const d = geometry.coordinates.map((ring) => ringToD(ring)).join(' ');
    return d ? [d] : [];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((poly) => poly.map((ring) => ringToD(ring)).join(' '))
      .filter(Boolean);
  }
  return [];
}

/** Natural Earth uses ISO_A2; some territories use -99 — map a few we need */
const ISO_A2_OVERRIDES = {
  France: 'fr',
  Norway: 'no',
  Kosovo: 'xk',
};

function resolveIso2(props) {
  const name = props?.ADMIN ?? props?.NAME ?? '';
  let raw = props?.ISO_A2 ?? props?.iso_a2 ?? '';
  if ((!raw || raw === '-99') && name && ISO_A2_OVERRIDES[name]) {
    raw = ISO_A2_OVERRIDES[name];
  }
  const code = String(raw).trim().toLowerCase();
  if (!code || code === '-99' || code.length !== 2) return null;
  return code;
}

function extractSomalilandFromLegacy() {
  if (!existsSync(LEGACY_PATH)) return null;
  const svg = readFileSync(LEGACY_PATH, 'utf8');
  const m = svg.match(/<path[^>]*id="_somaliland"[^>]*d="([^"]+)"/i);
  if (!m) return null;
  return m[1];
}

async function fetchGeoJson() {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${GEOJSON_URL}: ${res.status}`);
  return res.json();
}

function buildSvg(countryEntries, somalilandD) {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     viewBox="${VIEWBOX.minX} ${VIEWBOX.minY} ${VIEWBOX.width} ${VIEWBOX.height}"`,
    `     width="${VIEWBOX.width}px" height="${VIEWBOX.height}px"`,
    `     id="world-map">`,
    '<title>World Map</title>',
    '<desc>Natural Earth 110m countries, equirectangular. Built by scripts/build-world-map-svg.mjs</desc>',
    '<g>',
  ];

  for (const { id, pathDs } of countryEntries) {
    if (pathDs.length === 1) {
      lines.push(`  <path id="${id}" class="landmass" d="${pathDs[0]}"/>`);
    } else {
      lines.push(`  <g id="${id}">`);
      for (let i = 0; i < pathDs.length; i++) {
        const cls = i === 0 ? 'landmass mainland' : 'landmass';
        lines.push(`    <path class="${cls}" d="${pathDs[i]}"/>`);
      }
      lines.push('  </g>');
    }
  }

  if (somalilandD) {
    lines.push(`  <path id="_somaliland" class="landmass" d="${somalilandD}"/>`);
  }

  lines.push('</g>', '</svg>', '');
  return lines.join('\n');
}

async function main() {
  console.log('Fetching Natural Earth 110m countries…');
  const collection = await fetchGeoJson();

  const byId = new Map();

  for (const f of collection.features) {
    const id = resolveIso2(f.properties);
    if (!id || EXCLUDE_ISO2.has(id)) continue;
    const pathDs = geometryToPathDs(f.geometry);
    if (!pathDs.length) continue;

    if (byId.has(id)) {
      const existing = byId.get(id);
      existing.pathDs.push(...pathDs);
    } else {
      byId.set(id, { id, pathDs: [...pathDs] });
    }
  }

  const countryEntries = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const somalilandD = extractSomalilandFromLegacy();

  const svg = buildSvg(countryEntries, somalilandD);
  writeFileSync(OUT_PATH, svg, 'utf8');

  const kb = (Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1);
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Countries: ${countryEntries.length}${somalilandD ? ' + _somaliland' : ''}`);
  console.log(`  Size: ${kb} KB`);
  console.log(`  viewBox: 0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
