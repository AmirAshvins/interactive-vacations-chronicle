/**
 * Regenerates src/data/worldCities.ts from GeoNames cities15000 + map SVG country codes.
 * Run: node scripts/generate-world-cities.mjs
 * Requires /tmp/cities15000.zip (downloaded automatically if missing).
 */

import { readFileSync, writeFileSync, existsSync, createReadStream } from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_PATH = join(ROOT, 'apps/web/public/world-map.svg');
const OUT_PATH = join(ROOT, 'apps/web/src/data/worldCities.ts');
const GEONAMES_ZIP = '/tmp/cities15000.zip';

/** Stable IDs referenced by seed trips / manual picks — never re-slug these. */
const PINNED_CITIES = [
  { id: 'hargeisa', name: 'Hargeisa', countryCode: '_somaliland', lat: 9.5624, lng: 44.077 },
  { id: 'vancouver', name: 'Vancouver', countryCode: 'ca', lat: 49.2827, lng: -123.1207 },
  { id: 'toronto', name: 'Toronto', countryCode: 'ca', lat: 43.6532, lng: -79.3832 },
  { id: 'tehran', name: 'Tehran', countryCode: 'ir', lat: 35.6892, lng: 51.389 },
  { id: 'dubai', name: 'Dubai', countryCode: 'ae', lat: 25.2048, lng: 55.2708 },
];

const XL_COUNTRIES = new Set(['us', 'cn', 'in', 'br', 'ru', 'id', 'jp', 'mx', 'de', 'gb', 'fr', 'it', 'es', 'au', 'ca', 'tr', 'ir', 'pk', 'ng', 'eg', 'za', 'kr', 'th', 'vn', 'ph', 'bd', 'ar', 'co', 'pe', 'my', 'pl', 'ua']);

const GEONAMES_TXT = '/tmp/cities15000.txt';

function ensureGeonamesPath() {
  if (!existsSync(GEONAMES_TXT)) {
    if (!existsSync(GEONAMES_ZIP)) {
      console.log('Downloading GeoNames cities15000…');
      execSync(`curl -sL 'https://download.geonames.org/export/dump/cities15000.zip' -o '${GEONAMES_ZIP}'`);
    }
    execSync(`unzip -o '${GEONAMES_ZIP}' cities15000.txt -d /tmp`);
  }
  return GEONAMES_TXT;
}

function parseMapCountryCodes(svg) {
  const ids = new Set();
  for (const m of svg.matchAll(/\bid="([^"]+)"/g)) {
    const id = m[1];
    if (id === 'world-map') continue;
    ids.add(id.toLowerCase());
  }
  return [...ids].sort();
}

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'city';
}

function cityLimit(countryCode, totalInDataset) {
  if (XL_COUNTRIES.has(countryCode)) return 30;
  if (totalInDataset > 40) return 20;
  if (totalInDataset > 15) return 12;
  if (totalInDataset > 5) return 8;
  return totalInDataset;
}

async function parseGeonames(path) {
  const byCountry = new Map();
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const name = cols[2] || cols[1];
    const lat = parseFloat(cols[4]);
    const lng = parseFloat(cols[5]);
    const featureCode = cols[7];
    const country = cols[8].toLowerCase();
    const population = parseInt(cols[14], 10) || 0;
    if (!name || Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const entry = { name, lat, lng, population, isCapital: featureCode === 'PPLC' };
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country).push(entry);
  }

  for (const list of byCountry.values()) {
    list.sort((a, b) => b.population - a.population);
  }
  return byCountry;
}

function roundCoord(n) {
  return Math.round(n * 10000) / 10000;
}

function near(a, b, threshold = 0.08) {
  return Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;
}

function buildCities(mapCodes, geonames) {
  const cities = [];
  const usedIds = new Set();

  function addCity(city) {
    let id = city.id ?? slugify(city.name);
    if (usedIds.has(id)) {
      const suffix = city.countryCode.replace(/^_/, '');
      id = `${id}-${suffix}`;
    }
    let n = 2;
    while (usedIds.has(id)) {
      id = `${slugify(city.name)}-${n++}`;
    }
    usedIds.add(id);
    cities.push({
      id,
      name: city.name,
      countryCode: city.countryCode,
      lat: roundCoord(city.lat),
      lng: roundCoord(city.lng),
      ...(city.isCapital ? { isCapital: true } : {}),
    });
  }

  for (const pinned of PINNED_CITIES) {
    addCity({ ...pinned, id: pinned.id });
  }

  for (const code of mapCodes) {
    if (code.startsWith('_')) continue;
    const iso = code.toUpperCase();
    const pool = geonames.get(code) ?? [];
    const limit = cityLimit(code, pool.length);
    const picked = [];
    const seenNames = new Set();

    for (const c of pool) {
      const key = c.name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      picked.push(c);
      if (picked.length >= limit) break;
    }

    for (const c of picked) {
      const duplicatePinned = PINNED_CITIES.some(
        (p) => p.countryCode === code && (p.name.toLowerCase() === c.name.toLowerCase() || near(p, c)),
      );
      if (duplicatePinned) continue;
      addCity({ ...c, countryCode: code, isCapital: c.isCapital });
    }

    if (picked.length === 0) {
      addCity({
        id: `${code}-capital`,
        name: `${iso} (capital)`,
        countryCode: code,
        lat: 0,
        lng: 0,
        isCapital: true,
      });
    }
  }

  cities.sort((a, b) => {
    if (a.countryCode !== b.countryCode) return a.countryCode.localeCompare(b.countryCode);
    if (a.isCapital && !b.isCapital) return -1;
    if (!a.isCapital && b.isCapital) return 1;
    return a.name.localeCompare(b.name);
  });

  return cities;
}

function emitTs(cities) {
  const header = `export interface WorldCity {
  id: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  isCapital?: boolean;
}

/** Auto-generated from GeoNames cities15000 — run \`node scripts/generate-world-cities.mjs\` to refresh. */
export const WORLD_CITIES: WorldCity[] = `;

  const footer = `;

export function getCitiesForCountry(countryCode: string): WorldCity[] {
  const code = countryCode.toLowerCase();
  return WORLD_CITIES.filter((c) => c.countryCode === code).sort((a, b) => {
    if (a.isCapital && !b.isCapital) return -1;
    if (!a.isCapital && b.isCapital) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function findCityById(id: string | undefined): WorldCity | undefined {
  if (!id) return undefined;
  return WORLD_CITIES.find((c) => c.id === id);
}

export function getDefaultCityForCountry(countryCode: string): WorldCity | undefined {
  const list = getCitiesForCountry(countryCode);
  return list.find((c) => c.isCapital) ?? list[0];
}

export function matchCityForTrip(
  countryCode: string,
  name: string,
  lat: number,
  lng: number,
): WorldCity | undefined {
  const list = getCitiesForCountry(countryCode);
  const byName = list.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (byName) return byName;
  return list.find((c) => Math.abs(c.lat - lat) < 0.05 && Math.abs(c.lng - lng) < 0.05);
}
`;

  const body = JSON.stringify(cities, null, 2)
    .replace(/"isCapital": true/g, '"isCapital": true')
    .replace(/,\n      "isCapital": false/g, '');

  return header + body + footer;
}

async function main() {
  const svg = readFileSync(SVG_PATH, 'utf8');
  const mapCodes = parseMapCountryCodes(svg);
  const geonamesPath = ensureGeonamesPath();
  const geonames = await parseGeonames(geonamesPath);
  const cities = buildCities(mapCodes, geonames);

  const byCountry = new Map();
  for (const c of cities) {
    byCountry.set(c.countryCode, (byCountry.get(c.countryCode) ?? 0) + 1);
  }

  writeFileSync(OUT_PATH, emitTs(cities));
  console.log(`Wrote ${cities.length} cities across ${byCountry.size} countries → ${OUT_PATH}`);
  console.log('Sample counts:', {
    us: byCountry.get('us'),
    ca: byCountry.get('ca'),
    ir: byCountry.get('ir'),
    gb: byCountry.get('gb'),
    fr: byCountry.get('fr'),
  });
}

main();
