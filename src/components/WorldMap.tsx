import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { SolarState } from '../utils/solarEngine';
import type { Trip, FlightRoute } from '../types/travelogue';
import {
  projectCoordinates,
  unprojectCoordinates,
  getFlightPath,
  MAP_VIEWBOX_STRING,
  type ProjectOptions,
} from '../utils/flightArc';
import { HOME_ORIGIN_ID, resolveFlightEndpoints, type HomeOrigin } from '../utils/flightRoutes';
import { getCountryName, normalizeCountryCode } from '../utils/countryUtils';
import { latLngToScreen } from '../utils/tripCardPosition';
import MapPin from './MapPin';
import FlightArc, { MAX_ANIMATED_FLIGHTS } from './FlightArc';
import { useTvFocus } from '../context/TvFocusContext';
import {
  clampMapPan,
  focalFromClient,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  zoomMapAtPoint,
  type MapPan,
} from '../utils/mapGestures';

export type { Trip, FlightRoute };

interface WorldMapProps {
  solarState: SolarState;
  openTripIds: string[];
  trips: Trip[];
  flights: FlightRoute[];
  homeOrigin: HomeOrigin | null;
  visitedCountryCodes: string[];
  showFlightPaths: boolean;
  highlightVisited: boolean;
  onPinClick: (trip: Trip) => void;
  onTripLocationChange?: (tripId: string, lat: number, lng: number) => void;
  onTripCardAnchorsChange?: (anchors: Record<string, { x: number; y: number }>) => void;
  onPinScreenPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  onCountriesLoaded?: (codes: string[]) => void;
  materialMode: 'oak' | 'cork' | 'walnut' | 'auto';
  isOverlayVisible?: boolean;
  onMapClick?: () => void;
}

interface ParsedPath {
  id: string;
  d: string;
  className: string;
  countryId: string;
}

interface ParsedGroup {
  id: string;
  countryId: string;
  paths: ParsedPath[];
}

type ParsedNode =
  | { type: 'path'; data: ParsedPath }
  | { type: 'g'; data: ParsedGroup };

const WORLD_MAP_SVG_URL = `${import.meta.env.BASE_URL}world-map.svg`;

const FLIGHT_PLANE_CAP = MAX_ANIMATED_FLIGHTS * 2;

export default function WorldMap({
  solarState,
  openTripIds,
  trips,
  flights,
  homeOrigin,
  visitedCountryCodes,
  showFlightPaths,
  highlightVisited,
  onPinClick,
  onTripLocationChange,
  onTripCardAnchorsChange,
  onPinScreenPositionsChange,
  onCountriesLoaded,
  materialMode,
  isOverlayVisible = true,
  onMapClick,
}: WorldMapProps) {
  const [mapNodes, setMapNodes] = useState<ParsedNode[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<MapPan>({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const panSessionRef = useRef<{ startX: number; startY: number; startPan: MapPan } | null>(null);
  zoomRef.current = zoom;
  panRef.current = pan;
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [pinDrag, setPinDrag] = useState<{ tripId: string; lat: number; lng: number } | null>(
    null,
  );
  const pinDragPrepRef = useRef<{
    tripId: string;
    startX: number;
    startY: number;
    lat: number;
    lng: number;
    countryCode: string;
    cityKey?: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pinLayerRef = useRef<SVGSVGElement>(null);
  const flightLayerRef = useRef<SVGSVGElement>(null);
  const lastAnchorsRef = useRef<Record<string, { x: number; y: number }>>({});
  const prevOpenTripIdsRef = useRef<string[]>([]);
  const openTripIdsRef = useRef(openTripIds);
  const tripsRef = useRef(trips);
  const pinDragRef = useRef(pinDrag);
  const onTripCardAnchorsChangeRef = useRef(onTripCardAnchorsChange);
  openTripIdsRef.current = openTripIds;
  tripsRef.current = trips;
  pinDragRef.current = pinDrag;
  onTripCardAnchorsChangeRef.current = onTripCardAnchorsChange;
  const onPinScreenPositionsChangeRef = useRef(onPinScreenPositionsChange);
  onPinScreenPositionsChangeRef.current = onPinScreenPositionsChange;
  const tvFocus = useTvFocus();
  const [flightsReady, setFlightsReady] = useState(false);
  const visitedSet = new Set(visitedCountryCodes.map(normalizeCountryCode));
  const openTripSet = new Set(openTripIds);

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
          const countryCodes: string[] = [];

          Array.from(outerGroup.children).forEach((child, idx) => {
            const tagName = child.tagName.toLowerCase();
            const id = child.getAttribute('id') || `node-${idx}`;
            countryCodes.push(id);

            if (tagName === 'path') {
              parsed.push({
                type: 'path',
                data: {
                  id,
                  d: child.getAttribute('d') || '',
                  className: child.getAttribute('class') || '',
                  countryId: id,
                },
              });
            } else if (tagName === 'g') {
              parsed.push({
                type: 'g',
                data: {
                  id,
                  countryId: id,
                  paths: Array.from(child.getElementsByTagName('path')).map((p, pIdx) => ({
                    id: p.getAttribute('id') || `${id}-path-${pIdx}`,
                    d: p.getAttribute('d') || '',
                    className: p.getAttribute('class') || '',
                    countryId: id,
                  })),
                },
              });
            }
          });

          setMapNodes(parsed);
          onCountriesLoaded?.(countryCodes);
        }
      })
      .catch((err) => console.error('[WorldMap] Failed to load map:', err));
  }, [onCountriesLoaded]);

  const projectOpts = useCallback(
    (trip: { countryCode: string; cityKey?: string; id: string }): ProjectOptions => ({
      countryCode: trip.countryCode,
      cityKey: trip.cityKey,
      pinId: trip.id,
    }),
    [],
  );

  const flightPaths = useMemo(() => {
    if (!showFlightPaths) return [];

    return flights
      .map((flight, idx) => {
        const endpoints = resolveFlightEndpoints(flight, trips, homeOrigin);
        if (!endpoints) return null;

        const { fromLat, fromLng, toLat, toLng } = endpoints;
        const toTrip = trips.find((t) => t.id === flight.toTripId);
        const fromTrip =
          flight.fromTripId === HOME_ORIGIN_ID
            ? null
            : trips.find((t) => t.id === flight.fromTripId);
        const fromOptions: ProjectOptions = fromTrip
          ? projectOpts(fromTrip)
          : { countryCode: 'ca', cityKey: homeOrigin?.cityKey, pinId: 'home' };
        const toOptions = toTrip ? projectOpts(toTrip) : undefined;
        const pathD = getFlightPath(fromLat, fromLng, toLat, toLng, fromOptions, toOptions);
        const start = projectCoordinates(fromLat, fromLng, fromOptions);
        const end = projectCoordinates(toLat, toLng, toOptions);
        const duration = Math.max(
          6,
          Math.min(
            16,
            Math.floor(Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) / 30),
          ),
        );

        return { id: flight.id, pathD, duration, idx };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [showFlightPaths, flights, trips, homeOrigin, projectOpts]);

  const denseFlightLayer = flightPaths.length > 36;

  const flightGeometryKey = useMemo(
    () => flightPaths.map((entry) => `${entry.id}:${entry.pathD}:${entry.duration}`).join(';'),
    [flightPaths],
  );

  const animatePlanes =
    !denseFlightLayer && flightPaths.length <= FLIGHT_PLANE_CAP;

  // Defer flight layer until map paths are laid out.
  useEffect(() => {
    if (!showFlightPaths || mapNodes.length === 0 || flightPaths.length === 0) {
      setFlightsReady(false);
      return;
    }

    let cancelled = false;
    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        if (!cancelled) setFlightsReady(true);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
      setFlightsReady(false);
    };
  }, [showFlightPaths, mapNodes.length, flightGeometryKey, flightPaths.length]);

  const isVisited = (countryId: string) =>
    highlightVisited && visitedSet.has(normalizeCountryCode(countryId));

  const isPathHovered = (pathId: string, groupId?: string) =>
    hoveredCountryId === pathId || hoveredCountryId === groupId;

  const landmassClass = (countryId: string, hovered: boolean) => {
    const parts = ['landmass'];
    if (isVisited(countryId)) parts.push('visited-country');
    if (hovered) parts.push('hovered-country');
    return parts.join(' ');
  };

  const clientToLatLng = useCallback((clientX: number, clientY: number, options?: ProjectOptions) => {
    const svg = pinLayerRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return unprojectCoordinates(svgPt.x, svgPt.y, options);
  }, []);

  const handlePinPointerDown = useCallback(
    (e: React.PointerEvent, trip: Trip) => {
      if (!openTripIds.includes(trip.id) || !onTripLocationChange) return;
      if ((e.target as HTMLElement).closest('.map-pin')) {
        e.stopPropagation();
      }
      pinDragPrepRef.current = {
        tripId: trip.id,
        startX: e.clientX,
        startY: e.clientY,
        lat: trip.lat,
        lng: trip.lng,
        countryCode: trip.countryCode,
        cityKey: trip.cityKey,
      };
    },
    [onTripLocationChange, openTripIds],
  );

  const handlePinPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const prep = pinDragPrepRef.current;
      if (!prep && !pinDrag) return;

      if (prep && !pinDrag) {
        const dx = e.clientX - prep.startX;
        const dy = e.clientY - prep.startY;
        if (Math.hypot(dx, dy) < 6) return;
        setPinDrag({ tripId: prep.tripId, lat: prep.lat, lng: prep.lng });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      }

      if (!pinDrag && !pinDragPrepRef.current) return;
      const dragOpts = prep
        ? { countryCode: prep.countryCode, cityKey: prep.cityKey, pinId: prep.tripId }
        : pinDrag
          ? {
              countryCode:
                trips.find((t) => t.id === pinDrag.tripId)?.countryCode ?? 'ca',
              cityKey: trips.find((t) => t.id === pinDrag.tripId)?.cityKey,
              pinId: pinDrag.tripId,
            }
          : undefined;
      const coords = clientToLatLng(e.clientX, e.clientY, dragOpts);
      if (!coords) return;
      const activeId = pinDrag?.tripId ?? prep?.tripId;
      if (!activeId) return;
      setPinDrag({ tripId: activeId, lat: coords.lat, lng: coords.lng });
    },
    [clientToLatLng, pinDrag],
  );

  const handlePinPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasDragging = !!pinDrag;
      pinDragPrepRef.current = null;

      if (pinDrag && onTripLocationChange) {
        const trip = trips.find((t) => t.id === pinDrag.tripId);
        const coords = clientToLatLng(
          e.clientX,
          e.clientY,
          trip ? projectOpts(trip) : undefined,
        );
        if (coords && trip) {
          const moved =
            Math.abs(trip.lat - coords.lat) > 0.001 ||
            Math.abs(trip.lng - coords.lng) > 0.001;
          if (moved) {
            onTripLocationChange(pinDrag.tripId, coords.lat, coords.lng);
          }
        }
      }

      setPinDrag(null);
      if (wasDragging) {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      }
    },
    [clientToLatLng, onTripLocationChange, pinDrag, projectOpts, trips],
  );

  const applyMapView = useCallback((nextZoom: number, nextPan: MapPan) => {
    const el = mapContainerRef.current;
    if (!el) return;
    const clamped = clampMapPan(nextPan, nextZoom, el.clientWidth, el.clientHeight);
    const z = nextZoom <= MAP_MIN_ZOOM ? MAP_MIN_ZOOM : Math.min(MAP_MAX_ZOOM, nextZoom);
    const p = z <= MAP_MIN_ZOOM ? { x: 0, y: 0 } : clamped;
    zoomRef.current = z;
    panRef.current = p;
    setZoom(z);
    setPan(p);
  }, []);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (zoomRef.current <= MAP_MIN_ZOOM) return;
      applyMapView(zoomRef.current, panRef.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyMapView]);

  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('.map-reset-view-btn, button, a, input, label')) return;
    if ((e.target as HTMLElement).closest('.map-pin')) return;
    if (pinDrag) return;
    if (zoomRef.current <= MAP_MIN_ZOOM) return;

    panSessionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...panRef.current },
    };
    setIsDragging(true);
    setIsGesturing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    const session = panSessionRef.current;
    if (!session) return;

    applyMapView(
      zoomRef.current,
      {
        x: session.startPan.x + (e.clientX - session.startX),
        y: session.startPan.y + (e.clientY - session.startY),
      },
    );
  };

  const endStagePan = (e: React.PointerEvent) => {
    if (!panSessionRef.current) return;
    panSessionRef.current = null;
    setIsDragging(false);
    setIsGesturing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const focal = focalFromClient(e.clientX, e.clientY, rect);
      const delta = -e.deltaY * 0.0018;
      const { zoom: z, pan: p } = zoomMapAtPoint(
        zoomRef.current,
        panRef.current,
        zoomRef.current * Math.exp(delta),
        focal.x,
        focal.y,
        rect.width,
        rect.height,
      );
      zoomRef.current = z;
      panRef.current = p;
      setZoom(z);
      setPan(p);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const activeTouches = new Map<number, { x: number; y: number }>();
    let pinch: {
      startDist: number;
      startZoom: number;
      startPan: MapPan;
      midX: number;
      midY: number;
    } | null = null;

    const syncPinch = () => {
      if (!pinch || activeTouches.size < 2) return;
      const pts = [...activeTouches.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = dist / pinch.startDist;
      const rect = el.getBoundingClientRect();
      const { zoom: z, pan: p } = zoomMapAtPoint(
        pinch.startZoom,
        pinch.startPan,
        pinch.startZoom * scale,
        pinch.midX,
        pinch.midY,
        rect.width,
        rect.height,
      );
      zoomRef.current = z;
      panRef.current = p;
      setZoom(z);
      setPan(p);
    };

    const onTouchStart = (e: TouchEvent) => {
      for (const t of e.changedTouches) {
        activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      if (activeTouches.size === 2) {
        panSessionRef.current = null;
        setIsDragging(false);
        const pts = [...activeTouches.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const rect = el.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        pinch = {
          startDist: dist,
          startZoom: zoomRef.current,
          startPan: { ...panRef.current },
          midX: midX - rect.left - rect.width / 2,
          midY: midY - rect.top - rect.height / 2,
        };
        setIsGesturing(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const t of e.changedTouches) {
        if (activeTouches.has(t.identifier)) {
          activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
      if (pinch && activeTouches.size >= 2) {
        e.preventDefault();
        syncPinch();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of e.changedTouches) {
        activeTouches.delete(t.identifier);
      }
      if (activeTouches.size < 2) pinch = null;
      if (activeTouches.size === 0) setIsGesturing(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const resetZoom = () => {
    zoomRef.current = MAP_MIN_ZOOM;
    panRef.current = { x: 0, y: 0 };
    setZoom(MAP_MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  const updateTripCardAnchors = useCallback(() => {
    const onTripCardAnchorsChange = onTripCardAnchorsChangeRef.current;
    if (!onTripCardAnchorsChange) return;
    const openTripIds = openTripIdsRef.current;
    const trips = tripsRef.current;
    const pinDrag = pinDragRef.current;
    const pinLayer = pinLayerRef.current;
    if (!pinLayer || openTripIds.length === 0 || mapNodes.length === 0) {
      if (lastAnchorsRef.current && Object.keys(lastAnchorsRef.current).length > 0) {
        lastAnchorsRef.current = {};
        prevOpenTripIdsRef.current = [];
        onTripCardAnchorsChange({});
      }
      return;
    }

    const anchors: Record<string, { x: number; y: number }> = {};
    for (const tripId of openTripIds) {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) continue;
      const isDraggingPin = pinDrag?.tripId === tripId;
      const lat = isDraggingPin ? pinDrag.lat : trip.lat;
      const lng = isDraggingPin ? pinDrag.lng : trip.lng;
      const screen = latLngToScreen(lat, lng, pinLayer, projectOpts(trip));
      if (screen) anchors[tripId] = screen;
    }

    const last = lastAnchorsRef.current;
    const ids = Object.keys(anchors);
    const lastIds = Object.keys(last);
    const openSetChanged =
      openTripIds.length !== prevOpenTripIdsRef.current.length ||
      openTripIds.some((id) => !prevOpenTripIdsRef.current.includes(id));

    let changed =
      openSetChanged ||
      ids.length !== lastIds.length ||
      ids.some((id) => !last[id]) ||
      lastIds.some((id) => !anchors[id]);

    if (!changed) {
      for (const id of ids) {
        const a = anchors[id];
        const b = last[id];
        if (!b || Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      prevOpenTripIdsRef.current = openTripIds;
      lastAnchorsRef.current = anchors;
      onTripCardAnchorsChange(anchors);
    }
  }, [mapNodes.length, projectOpts]);

  useEffect(() => {
    if (openTripIds.length === 0) {
      updateTripCardAnchors();
      return;
    }

    let frame = 0;
    const tick = () => {
      updateTripCardAnchors();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [openTripIds.length, updateTripCardAnchors]);

  const reportPinScreenPositions = useCallback(() => {
    const onChange = onPinScreenPositionsChangeRef.current;
    if (!onChange) return;
    const pinLayer = pinLayerRef.current;
    if (!pinLayer || mapNodes.length === 0) return;

    const positions: Record<string, { x: number; y: number }> = {};
    for (const trip of tripsRef.current) {
      const isDraggingPin = pinDragRef.current?.tripId === trip.id;
      const lat = isDraggingPin ? pinDragRef.current!.lat : trip.lat;
      const lng = isDraggingPin ? pinDragRef.current!.lng : trip.lng;
      const screen = latLngToScreen(lat, lng, pinLayer, projectOpts(trip));
      if (screen) positions[trip.id] = screen;
    }
    onChange(positions);
  }, [mapNodes.length, projectOpts]);

  useEffect(() => {
    if (!onPinScreenPositionsChange) return;
    if (mapNodes.length === 0) return;

    let frame = 0;
    const tick = () => {
      reportPinScreenPositions();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onPinScreenPositionsChange, mapNodes.length, reportPinScreenPositions, trips.length]);

  const hoveredName = hoveredCountryId ? getCountryName(hoveredCountryId) : null;
  const focusedPinTrip =
    tvFocus.enabled && tvFocus.state.zone === 'map' && tvFocus.state.mapPinId
      ? trips.find((t) => t.id === tvFocus.state.mapPinId)
      : null;

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (hoveredCountryId) {
      setTooltipPos({ x: e.clientX + 16, y: e.clientY - 8 });
    }
  };

  return (
    <div
      ref={mapContainerRef}
      className="map-stage map-stage-gestures select-none"
      data-phase={solarState.phase}
      data-material={activeMaterial}
      style={{ cursor: isDragging ? 'grabbing' : zoom > MAP_MIN_ZOOM ? 'grab' : 'default' }}
      onPointerDown={handleStagePointerDown}
      onPointerMove={handleStagePointerMove}
      onPointerUp={endStagePan}
      onPointerCancel={endStagePan}
      onMouseMove={handleStageMouseMove}
      onClick={() => onMapClick?.()}
    >
      <div className="spotlight-overlay" />

      <div
        className="map-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isGesturing ? 'none' : 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div className="map-aspect-box">
          {mapNodes.length > 0 ? (
            <>
              <svg
                viewBox={MAP_VIEWBOX_STRING}
                id="world-map"
                className={`world-map-svg ${materialClass}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <g>
                  {mapNodes.map((node) => {
                    if (node.type === 'path') {
                      const hovered = isPathHovered(node.data.id);
                      return (
                        <path
                          key={node.data.id}
                          id={node.data.id}
                          d={node.data.d}
                          className={landmassClass(node.data.countryId, hovered)}
                          onMouseEnter={() => setHoveredCountryId(node.data.id)}
                          onMouseLeave={() => setHoveredCountryId(null)}
                        />
                      );
                    }
                    const hovered = isPathHovered(node.data.id);
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
                            className={landmassClass(node.data.countryId, hovered)}
                          />
                        ))}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {showFlightPaths && flightsReady && (
                <svg
                  ref={flightLayerRef}
                  className={`flight-layer${denseFlightLayer ? ' flight-layer--dense' : ''}`}
                  viewBox={MAP_VIEWBOX_STRING}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {flightPaths.map((entry) => (
                    <FlightArc
                      key={entry.id}
                      id={entry.id}
                      pathD={entry.pathD}
                      duration={entry.duration}
                      animatePlane={animatePlanes}
                      animationDelay={entry.idx * 0.35}
                    />
                  ))}
                </svg>
              )}

              <svg
                ref={pinLayerRef}
                className="pin-layer"
                viewBox={MAP_VIEWBOX_STRING}
                preserveAspectRatio="xMidYMid meet"
              >
                {trips.map((trip) => {
                  const isDraggingPin = pinDrag?.tripId === trip.id;
                  const lat = isDraggingPin ? pinDrag.lat : trip.lat;
                  const lng = isDraggingPin ? pinDrag.lng : trip.lng;
                  const { x, y } = projectCoordinates(lat, lng, projectOpts(trip));
                  const isOpen = openTripSet.has(trip.id);
                  const isDraggable = isOpen && !!onTripLocationChange;

                  return (
                    <g
                      key={trip.id}
                      transform={`translate(${x}, ${y})`}
                      className={`map-pin-anchor ${isDraggable ? 'map-pin-draggable' : ''} ${isDraggingPin ? 'map-pin-dragging' : ''}`}
                      onPointerDown={(e) => handlePinPointerDown(e, trip)}
                      onPointerMove={handlePinPointerMove}
                      onPointerUp={handlePinPointerUp}
                      onPointerCancel={handlePinPointerUp}
                    >
                      <foreignObject x={-7} y={-7} width={14} height={14} overflow="visible">
                        <MapPin
                          pin={trip}
                          selected={isOpen}
                          tvFocused={tvFocus.isMapPinFocused(trip.id)}
                          embedded
                          draggable={isDraggable && !tvFocus.enabled}
                          onClick={() => onPinClick(trip)}
                        />
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-light tracking-widest uppercase opacity-40">
              Carving the Map...
            </div>
          )}
        </div>
      </div>

      {zoom > MAP_MIN_ZOOM &&
        createPortal(
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            className={`map-reset-view-btn tv-hud-element ${isOverlayVisible ? '' : 'tv-hud-hidden'}`}
          >
            Reset view
          </button>,
          document.body,
        )}

      <div
        className={`pointer-events-none fixed z-50 rounded-md border border-black/5 bg-white/90 px-3 py-1.5 text-[10px] font-light uppercase tracking-widest text-black/70 shadow-lg backdrop-blur-md transition-opacity duration-200 ${
          (hoveredName || focusedPinTrip) && isOverlayVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: tooltipPos.x, top: tooltipPos.y, fontFamily: 'var(--font-sans)' }}
      >
        {focusedPinTrip ? focusedPinTrip.name : hoveredName}
      </div>
    </div>
  );
}
