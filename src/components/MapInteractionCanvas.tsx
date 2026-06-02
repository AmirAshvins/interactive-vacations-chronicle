import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  type FlightCanvasEntry,
  renderMapCanvas,
  type MapCanvasDrawState,
  type MapCanvasTheme,
} from '../canvas/mapCanvasRenderer';
import type { PinCanvasEntry } from '../canvas/mapPinCanvas';
import type { MapPinStyleId } from '../data/mapPinStyles';
import type { MapPinStack } from '../utils/mapPinDisplay';
import { projectCoordinates, unprojectCoordinates } from '../utils/mapProjection';
import { parseQuadraticBezierPath } from '../utils/flightPathGeometry';
import { clientToViewBox } from '../utils/mapViewFit';

export interface MapInteractionCanvasHandle {
  clientToLatLng: (clientX: number, clientY: number) => { lat: number; lng: number } | null;
}

interface FlightPathInput {
  id: string;
  pathD: string;
  duration: number;
  idx: number;
}

interface MapInteractionCanvasProps {
  mapSvgRef: React.RefObject<SVGSVGElement | null>;
  flights: FlightPathInput[];
  pinStacks: MapPinStack[];
  pinScale: number;
  pinVisualScale: number;
  mapPinStyle: MapPinStyleId;
  openTripIds: string[];
  tvFocusedPinIds: string[];
  pinDrag: { tripId: string; lat: number; lng: number } | null;
  isDarkPhase: boolean;
  showFlights: boolean;
  denseFlightLayer: boolean;
  zoom: number;
  tvInteraction: boolean;
  theme: MapCanvasTheme;
}

const MapInteractionCanvas = forwardRef<MapInteractionCanvasHandle, MapInteractionCanvasProps>(
  function MapInteractionCanvas(
    {
      mapSvgRef,
      flights,
      pinStacks,
      pinScale,
      pinVisualScale,
      mapPinStyle,
      openTripIds,
      tvFocusedPinIds,
      pinDrag,
      isDarkPhase,
      showFlights,
      denseFlightLayer,
      zoom,
      tvInteraction,
      theme,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sizeRef = useRef({ width: 0, height: 0 });
    const rafRef = useRef(0);

    const flightEntries = useMemo((): FlightCanvasEntry[] => {
      return flights
        .map((flight) => {
          const bezier = parseQuadraticBezierPath(flight.pathD);
          if (!bezier) return null;
          return {
            id: flight.id,
            path2d: new Path2D(flight.pathD),
            bezier,
            duration: flight.duration,
            idx: flight.idx,
            animationDelay: flight.idx * 0.35,
          };
        })
        .filter((entry): entry is FlightCanvasEntry => entry !== null);
    }, [flights]);

    const pinEntries = useMemo((): PinCanvasEntry[] => {
      const openTripSet = new Set(openTripIds);
      const tvFocusedSet = new Set(tvFocusedPinIds);

      return pinStacks.map((stack) => {
        const trip = stack.displayTrip;
        const isDraggingPin = pinDrag?.tripId === trip.id;
        const lat = isDraggingPin ? pinDrag!.lat : stack.lat;
        const lng = isDraggingPin ? pinDrag!.lng : stack.lng;
        const { x, y } = projectCoordinates(lat, lng);

        return {
          x,
          y,
          trip,
          selected: stack.trips.some((t) => openTripSet.has(t.id)),
          tvFocused: stack.trips.some((t) => tvFocusedSet.has(t.id)),
          stackCount: stack.count,
          isDragging: isDraggingPin,
        };
      });
    }, [pinStacks, openTripIds, tvFocusedPinIds, pinDrag]);

    const drawFrame = useCallback((now: number) => {
      const canvas = canvasRef.current;
      const state = drawStateRef.current;
      if (!canvas || !state) return;
      renderMapCanvas(canvas, state, now);
    }, []);

    const drawStateRef = useRef<MapCanvasDrawState | null>(null);

    drawStateRef.current = {
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      dpr: Math.min(window.devicePixelRatio || 1, tvInteraction ? 2 : 2.5),
      zoom,
      showFlights,
      denseFlightLayer,
      flights: flightEntries,
      pins: pinEntries,
      pinScale,
      pinVisualScale,
      mapPinStyle,
      isDarkPhase,
      theme,
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        sizeRef.current = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        drawFrame(performance.now());
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [drawFrame]);

    useEffect(() => {
      drawFrame(performance.now());
    }, [
      drawFrame,
      flightEntries,
      pinEntries,
      pinScale,
      pinVisualScale,
      mapPinStyle,
      isDarkPhase,
      showFlights,
      denseFlightLayer,
      zoom,
      theme,
    ]);

    useEffect(() => {
      if (!showFlights) return;

      const loop = (now: number) => {
        drawFrame(now);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }, [showFlights, drawFrame]);

    const clientToLatLng = useCallback(
      (clientX: number, clientY: number) => {
        const svg = mapSvgRef.current;
        if (!svg) return null;
        const pt = clientToViewBox(svg, clientX, clientY);
        if (!pt) return null;
        return unprojectCoordinates(pt.x, pt.y);
      },
      [mapSvgRef],
    );

    useImperativeHandle(ref, () => ({ clientToLatLng }), [clientToLatLng]);

    return (
      <div ref={containerRef} className="map-interaction-canvas-wrap">
        <canvas ref={canvasRef} className="map-interaction-canvas" aria-hidden />
      </div>
    );
  },
);

export default MapInteractionCanvas;
