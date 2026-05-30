import { useState, useEffect, useRef } from 'react';
import type { SolarState, CityConfig } from '../utils/solarEngine';
import { projectCoordinates, getGreatCirclePath } from '../utils/flightArc';
import MapPin from './MapPin';

export interface FlightRoute {
  id: string;
  fromCity: string;
  toCity: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

export interface TravelPin {
  id: string;
  cityKey: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  material: 'brass' | 'copper';
}

interface WorldMapProps {
  solarState: SolarState;
  selectedCity: CityConfig;
  pins: TravelPin[];
  flights: FlightRoute[];
  onPinClick: (pin: TravelPin) => void;
  showGrid: boolean;
  materialMode: 'oak' | 'cork' | 'walnut' | 'auto';
  onMapClick?: () => void;
}

interface ParsedPath {
  id: string;
  d: string;
  className: string;
}

interface ParsedGroup {
  id: string;
  paths: ParsedPath[];
}

type ParsedNode =
  | { type: 'path'; data: ParsedPath }
  | { type: 'g'; data: ParsedGroup };

const MAP_VIEWBOX = '30.767 241.591 784.077 458.627';
const WORLD_MAP_SVG_URL = `${import.meta.env.BASE_URL}world-map.svg`;

/** Top-down plane silhouette — nose points +X for rotate="auto" */
const PLANE_PATH = 'M 0 0 L 11 -0.8 L 13 0 L 11 0.8 Z M 2.5 -3.2 L 7 -0.8 L 2.5 -0.8 Z M 2.5 0.8 L 7 0.8 L 2.5 3.2 Z';

export default function WorldMap({
  solarState,
  selectedCity,
  pins,
  flights,
  onPinClick,
  showGrid,
  materialMode,
  onMapClick,
}: WorldMapProps) {
  const [mapNodes, setMapNodes] = useState<ParsedNode[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const activeMaterial = materialMode === 'auto' ? solarState.autoMaterial : materialMode;
  const materialClass = `material-${activeMaterial}`;

  useEffect(() => {
    fetch(WORLD_MAP_SVG_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load map asset');
        return res.text();
      })
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const outerGroup = doc.querySelector('#world-map > g');

        if (outerGroup) {
          const parsed: ParsedNode[] = [];
          Array.from(outerGroup.children).forEach((child, idx) => {
            const tagName = child.tagName.toLowerCase();
            const id = child.getAttribute('id') || `node-${idx}`;

            if (tagName === 'path') {
              parsed.push({
                type: 'path',
                data: {
                  id,
                  d: child.getAttribute('d') || '',
                  className: child.getAttribute('class') || '',
                },
              });
            } else if (tagName === 'g') {
              parsed.push({
                type: 'g',
                data: {
                  id,
                  paths: Array.from(child.getElementsByTagName('path')).map((p, pIdx) => ({
                    id: p.getAttribute('id') || `${id}-path-${pIdx}`,
                    d: p.getAttribute('d') || '',
                    className: p.getAttribute('class') || '',
                  })),
                },
              });
            }
          });
          setMapNodes(parsed);
        }
      })
      .catch((err) => console.error('[WorldMap] Failed to load map:', err));
  }, []);

  const isPathHovered = (pathId: string, groupId?: string) =>
    hoveredCountryId === pathId || hoveredCountryId === groupId;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.map-pin')) return;
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const maxPan = 400 * zoom;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x)),
        y: Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y)),
      });
    }
    if (hoveredCountryId) {
      setTooltipPos({ x: e.clientX + 16, y: e.clientY - 8 });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = 1.08;
    const newZoom =
      e.deltaY < 0 ? Math.min(3.0, zoom * factor) : Math.max(1.0, zoom / factor);
    setZoom(newZoom);
    if (newZoom === 1.0) setPan({ x: 0, y: 0 });
  };

  const resetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const hoveredName = hoveredCountryId ? getCountryName(hoveredCountryId) : null;

  return (
    <div
      ref={mapContainerRef}
      className="map-stage select-none"
      data-phase={solarState.phase}
      style={{ cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={() => onMapClick?.()}
    >
      <div className="spotlight-overlay" />
      {showGrid && <div className="blueprint-grid" />}

      <div
        className="map-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.35s ease-out',
        }}
      >
        <div className="map-aspect-box">
          {mapNodes.length > 0 ? (
            <>
              <svg
                viewBox={MAP_VIEWBOX}
                id="world-map"
                className={`world-map-svg ${materialClass}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <g>
                  {mapNodes.map((node) => {
                    if (node.type === 'path') {
                      return (
                        <path
                          key={node.data.id}
                          id={node.data.id}
                          d={node.data.d}
                          className={`landmass ${node.data.className} ${isPathHovered(node.data.id) ? 'hovered-country' : ''}`}
                          onMouseEnter={() => setHoveredCountryId(node.data.id)}
                          onMouseLeave={() => setHoveredCountryId(null)}
                        />
                      );
                    }
                    return (
                      <g
                        key={node.data.id}
                        id={node.data.id}
                        onMouseEnter={() => setHoveredCountryId(node.data.id)}
                        onMouseLeave={() => setHoveredCountryId(null)}
                      >
                        {node.data.paths.map((p) => (
                          <path
                            key={p.id}
                            id={p.id}
                            d={p.d}
                            className={`landmass ${p.className} ${isPathHovered(p.id, node.data.id) ? 'hovered-country' : ''}`}
                          />
                        ))}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Flight routes on separate layer — prevents fill bleed onto arcs */}
              <svg
                className="flight-layer"
                viewBox={MAP_VIEWBOX}
                preserveAspectRatio="xMidYMid meet"
              >
                {flights.map((flight, idx) => {
                  const duplicateIndex = flights.slice(0, idx).filter(
                    (f) =>
                      (f.fromCity === flight.fromCity && f.toCity === flight.toCity) ||
                      (f.fromCity === flight.toCity && f.toCity === flight.fromCity),
                  ).length;
                  const laneOffset = duplicateIndex * 6;
                  const pathD = getGreatCirclePath(
                    flight.fromLat,
                    flight.fromLng,
                    flight.toLat,
                    flight.toLng,
                    laneOffset,
                  );
                  const arcId = `arc-${flight.id}`;
                  const start = projectCoordinates(flight.fromLat, flight.fromLng);
                  const end = projectCoordinates(flight.toLat, flight.toLng);
                  const duration = Math.max(
                    6,
                    Math.min(16, Math.floor(Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) / 30)),
                  );

                  return (
                    <g key={flight.id}>
                      <path id={arcId} d={pathD} className="flight-arc" />
                      <g className="flight-plane-group">
                        <animateMotion
                          dur={`${duration}s`}
                          repeatCount="indefinite"
                          rotate="auto"
                          calcMode="linear"
                        >
                          <mpath href={`#${arcId}`} />
                        </animateMotion>
                        <path d={PLANE_PATH} className="flight-plane" transform="translate(-1, 0)" />
                      </g>
                    </g>
                  );
                })}
              </svg>

              {pins.map((pin) => {
                const coords = projectCoordinates(pin.lat, pin.lng);
                const isSelected = selectedCity.name.toLowerCase() === pin.cityKey.toLowerCase();
                const leftPercent = ((coords.x - 30.767) / 784.077) * 100;
                const topPercent = ((coords.y - 241.591) / 458.627) * 100;

                return (
                  <div
                    key={pin.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      zIndex: 25,
                    }}
                  >
                    <MapPin
                      pin={pin}
                      selected={isSelected}
                      onClick={() => onPinClick(pin)}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-light tracking-widest uppercase opacity-40">
              Carving the Map...
            </div>
          )}
        </div>
      </div>

      {zoom > 1 && (
        <button
          type="button"
          onClick={resetZoom}
          className="absolute bottom-4 left-4 z-30 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-black/60 shadow-lg backdrop-blur-sm transition-all hover:bg-white tv-hud-element"
        >
          Reset view
        </button>
      )}

      <div
        className={`pointer-events-none fixed z-50 rounded-md border border-black/5 bg-white/90 px-3 py-1.5 text-[10px] font-light uppercase tracking-widest text-black/70 shadow-lg backdrop-blur-md transition-opacity duration-200 ${
          hoveredName ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: tooltipPos.x, top: tooltipPos.y, fontFamily: 'var(--font-sans)' }}
      >
        {hoveredName}
      </div>
    </div>
  );
}

function getCountryName(id: string): string {
  const map: Record<string, string> = {
    ca: 'Canada',
    us: 'United States',
    ir: 'Iran',
    gb: 'United Kingdom',
    fr: 'France',
    de: 'Germany',
    jp: 'Japan',
    au: 'Australia',
    br: 'Brazil',
    it: 'Italy',
    es: 'Spain',
    ru: 'Russia',
    cn: 'China',
    in: 'India',
    za: 'South Africa',
    mx: 'Mexico',
    sa: 'Saudi Arabia',
    ae: 'United Arab Emirates',
    eg: 'Egypt',
    tr: 'Turkey',
    ar: 'Argentina',
    kp: 'North Korea',
    kr: 'South Korea',
    gl: 'Greenland',
    is: 'Iceland',
    nz: 'New Zealand',
    ch: 'Switzerland',
    nl: 'Netherlands',
    se: 'Sweden',
    no: 'Norway',
    fi: 'Finland',
  };

  if (id.startsWith('_')) {
    return id.substring(1).replace(/_/g, ' ');
  }

  return map[id.toLowerCase()] || id.toUpperCase();
}
