/**
 * Dev utility — inspect country path centroids in world-map.svg.
 * Map pins use equirectangular projection in src/utils/mapProjection.ts (not this file).
 * Run: node scripts/calibrate-map-projection.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_PATH = join(ROOT, 'apps/web/public/world-map.svg');

const GEO_CENTERS = {
  us: [39.8283, -98.5795],
  ca: [56.1304, -106.3468],
  mx: [23.6345, -102.5528],
  br: [-14.235, -51.9253],
  ar: [-38.4161, -63.6167],
  cl: [-35.6751, -71.543],
  gb: [55.3781, -3.436],
  fr: [46.2276, 2.2137],
  de: [51.1657, 10.4515],
  es: [40.4637, -3.7492],
  it: [41.8719, 12.5674],
  ru: [61.524, 105.3188],
  cn: [35.8617, 104.1954],
  in: [20.5937, 78.9629],
  au: [-25.2744, 133.7751],
  jp: [36.2048, 138.2529],
  za: [-30.5595, 22.9375],
  eg: [26.8206, 30.8025],
  tr: [38.9637, 35.2433],
  ir: [32.4279, 53.688],
  sa: [23.8859, 45.0792],
  id: [-0.7893, 113.9213],
  ng: [9.082, 8.6753],
  ke: [-0.0236, 37.9062],
  is: [64.9631, -19.0208],
  gr: [39.0742, 21.8243],
  pt: [39.3999, -8.2245],
  nl: [52.1326, 5.2913],
  be: [50.5039, 4.4699],
  pl: [51.9194, 19.1451],
  se: [60.1282, 18.6435],
  no: [60.472, 8.4689],
  fi: [61.9241, 25.7482],
  ua: [48.3794, 31.1656],
  kz: [48.0196, 66.9237],
  th: [15.87, 100.9925],
  vn: [14.0583, 108.2772],
  ph: [12.8797, 121.774],
  my: [4.2105, 101.9758],
  nz: [-40.9006, 174.886],
  co: [4.5709, -74.2973],
  pe: [-9.19, -75.0152],
  ve: [6.4238, -66.5897],
  cu: [21.5218, -77.7812],
  jm: [-18.1096, -77.2975],
  ie: [53.4129, -8.2439],
  ch: [46.8182, 8.2275],
  at: [47.5162, 14.5501],
  cz: [49.8175, 15.473],
  hu: [47.1625, 19.5033],
  ro: [45.9432, 24.9668],
  bg: [42.7339, 25.4858],
  hr: [45.1, 15.2],
  rs: [44.0165, 21.0059],
  il: [31.0461, 34.8516],
  ae: [23.4241, 53.8478],
  pk: [30.3753, 69.3451],
  bd: [23.685, 90.3563],
  kr: [35.9078, 127.7669],
  tw: [23.6978, 120.9605],
  hk: [22.3193, 114.1694],
  sg: [1.3521, 103.8198],
  lk: [7.8731, 80.7718],
  np: [28.3949, 84.124],
  mm: [21.9162, 95.956],
  et: [9.145, 40.4897],
  ma: [31.7917, -7.0926],
  dz: [28.0339, 1.6596],
  ly: [26.3351, 17.2283],
  tn: [33.8869, 9.5375],
  sd: [12.8628, 30.2176],
  ao: [-11.2027, 17.8739],
  mz: [-18.6657, 35.5296],
  tz: [-6.369, 34.8888],
  gh: [7.9465, -1.0232],
  ci: [7.54, -5.5471],
  sn: [14.4974, -14.4524],
  cm: [7.3697, 12.3547],
  cd: [-4.0383, 21.7587],
  cg: [-0.228, 15.8277],
  na: [-22.9576, 18.4904],
  bw: [-22.3285, 24.6849],
  zm: [-13.1339, 27.8493],
  zw: [-19.0154, 29.1549],
  mg: [-18.7669, 46.8691],
  bo: [-16.2902, -63.5887],
  py: [-23.4425, -58.4438],
  uy: [-32.5228, -55.7658],
  ec: [-1.8312, -78.1834],
  pa: [8.538, -80.7821],
  cr: [9.7489, -83.7534],
  gt: [15.7835, -90.2308],
  hn: [15.2, -86.2419],
  ni: [12.8654, -85.2072],
  sv: [13.7942, -88.8965],
  do: [18.7357, -70.1627],
  ht: [18.9712, -72.2852],
  pr: [18.2208, -66.5901],
  tt: [10.6918, -61.2225],
  bb: [13.1939, -59.5432],
  bs: [25.0343, -77.3963],
  az: [40.1431, 47.5769],
  am: [40.0691, 45.0382],
  ge: [42.3154, 43.3569],
  by: [53.7098, 27.9534],
  lt: [55.1694, 23.8813],
  lv: [56.8796, 24.6032],
  ee: [58.5953, 25.0136],
  sk: [48.669, 19.699],
  si: [46.1512, 14.9955],
  ba: [43.9159, 17.6791],
  mk: [41.5124, 21.7453],
  al: [41.1533, 20.1683],
  me: [42.7087, 19.3744],
  md: [47.4116, 28.3699],
  lu: [49.8153, 6.1296],
  dk: [56.2639, 9.5018],
  cy: [35.1264, 33.4299],
  mt: [35.9375, 14.3754],
  qa: [25.3548, 51.1839],
  kw: [29.3117, 47.4818],
  om: [21.5126, 55.9233],
  ye: [15.5527, 48.5164],
  sy: [34.8021, 38.9968],
  iq: [33.2232, 43.6793],
  jo: [30.5852, 36.2384],
  lb: [33.8547, 35.8623],
  af: [33.9391, 67.71],
  uz: [41.3775, 64.5853],
  tm: [38.9697, 59.5563],
  kg: [41.2044, 74.7661],
  tj: [38.861, 71.2761],
  mn: [46.8625, 103.8467],
  kh: [12.5657, 104.991],
  la: [19.8563, 102.4955],
  bn: [4.5353, 114.7277],
  tl: [-8.8742, 125.7275],
  pg: [-6.315, 143.9555],
  fj: [-17.7134, 178.065],
  mu: [-20.3484, 57.5522],
  mv: [3.2028, 73.2207],
  bt: [27.5142, 90.4336],
  kp: [40.3399, 127.5101],
  _somaliland: [9.5624, 44.077],
};

function roughCentroid(pathD) {
  const coords = [];
  const re = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(pathD))) {
    coords.push([parseFloat(m[1]), parseFloat(m[2])]);
  }
  if (!coords.length) return null;
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function extractCountries(svg) {
  const entries = [];
  const pathRe = /<path[^>]*id="([^"]+)"[^>]*d="([^"]+)"/g;
  let m;
  while ((m = pathRe.exec(svg))) {
    const id = m[1].toLowerCase();
    if (!GEO_CENTERS[id]) continue;
    const c = roughCentroid(m[2]);
    if (c) entries.push({ id, svgX: c[0], svgY: c[1], lat: GEO_CENTERS[id][0], lng: GEO_CENTERS[id][1] });
  }
  const groupRe = /<g[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
  while ((m = groupRe.exec(svg))) {
    const id = m[1].toLowerCase();
    if (!GEO_CENTERS[id] || entries.some((e) => e.id === id)) continue;
    const inner = m[2];
    const paths = [...inner.matchAll(/d="([^"]+)"/g)].map((x) => x[1]);
    const cents = paths.map(roughCentroid).filter(Boolean);
    if (!cents.length) continue;
    const svgX = cents.reduce((s, c) => s + c[0], 0) / cents.length;
    const svgY = cents.reduce((s, c) => s + c[1], 0) / cents.length;
    entries.push({ id, svgX, svgY, lat: GEO_CENTERS[id][0], lng: GEO_CENTERS[id][1] });
  }
  return entries;
}

const svg = readFileSync(SVG_PATH, 'utf8');
const anchors = extractCountries(svg);

const outPath = join(ROOT, 'src/data/mapProjectionAnchors.json');
writeFileSync(outPath, JSON.stringify(anchors, null, 2));
console.log('Wrote', anchors.length, 'anchors to', outPath);
