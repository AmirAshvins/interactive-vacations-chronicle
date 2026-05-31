import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type { Trip } from '../types/travelogue';
import { getCountryName, formatTripDuration } from '../utils/countryUtils';
import TripImages from './TripImages';
import { GripHorizontal, MapPin, Navigation, X } from 'lucide-react';

export interface TripCardLayout {
  z: number;
  offsetX: number;
  offsetY: number;
}

interface TripDetailCardProps {
  trip: Trip;
  layout: TripCardLayout;
  position: { x: number; y: number };
  isDarkPhase: boolean;
  isOverlayVisible: boolean;
  onClose: () => void;
  onFocus: () => void;
  onMoveOffset: (offsetX: number, offsetY: number) => void;
  onOpenChronicle: () => void;
}

export default function TripDetailCard({
  trip,
  layout,
  position,
  isDarkPhase,
  isOverlayVisible,
  onClose,
  onFocus,
  onMoveOffset,
  onOpenChronicle,
}: TripDetailCardProps) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
    dragging: boolean;
    pointerId: number;
  } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tripDuration = formatTripDuration(trip);

  const handleHeaderPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.trip-detail-card-close')) return;
      e.stopPropagation();
      onFocus();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originOffsetX: layout.offsetX,
        originOffsetY: layout.offsetY,
        dragging: false,
        pointerId: e.pointerId,
      };
    },
    [layout.offsetX, layout.offsetY, onFocus],
  );

  const handleHeaderPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (!dragRef.current.dragging) {
        if (Math.hypot(dx, dy) < 6) return;
        dragRef.current.dragging = true;
        e.preventDefault();
        headerRef.current?.setPointerCapture(e.pointerId);
      }

      onMoveOffset(
        dragRef.current.originOffsetX + dx,
        dragRef.current.originOffsetY + dy,
      );
    },
    [onMoveOffset],
  );

  const handleHeaderPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.dragging && e.pointerId === dragRef.current.pointerId) {
      headerRef.current?.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }, []);

  return (
    <div
      className={`trip-detail-card tv-hud-element fixed flex w-[min(320px,26vw)] flex-col gap-4 rounded-lg border p-0 shadow-2xl ${
        isDarkPhase ? 'trip-detail-dark' : 'trip-detail-light'
      } ${isOverlayVisible ? 'opacity-100' : 'pointer-events-none opacity-0 tv-hud-hidden-right'}`}
      style={{ left: position.x, top: position.y, zIndex: layout.z }}
      onPointerDown={onFocus}
    >
      <div
        ref={headerRef}
        className={`trip-detail-card-header flex cursor-grab items-start justify-between gap-3 rounded-t-lg border-b px-5 py-4 active:cursor-grabbing ${
          isDarkPhase ? 'border-white/8 bg-white/[0.02]' : 'border-black/6 bg-black/[0.02]'
        }`}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-widest opacity-40">
            <GripHorizontal size={12} />
            <span>Drag to move</span>
          </div>
          <h3 className="truncate text-lg font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
            {trip.name}
          </h3>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#a58452]">
            {getCountryName(trip.countryCode)}
          </p>
          {tripDuration && (
            <p className="mt-1 text-[9px] font-mono uppercase tracking-widest opacity-50">{tripDuration}</p>
          )}
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="trip-detail-card-close shrink-0 rounded-full p-1.5 opacity-60 hover:opacity-100"
          aria-label={`Close ${trip.name}`}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest opacity-50">
            <Navigation size={9} />
            <span>
              {trip.lat.toFixed(4)}°, {trip.lng.toFixed(4)}°
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[8px] uppercase tracking-widest text-[#a58452]/80">
            <MapPin size={10} />
            Drag the pin on the map to reposition
          </p>
        </div>

        {(trip.imageIds?.length ?? 0) > 0 ? (
          <TripImages imageIds={trip.imageIds} alt={trip.name} isDarkPhase={isDarkPhase} />
        ) : (
          <div className="flex h-28 items-center justify-center rounded border border-black/5 bg-black/5">
            <span
              className="select-none text-xl font-light uppercase tracking-[0.2em] opacity-20"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {trip.name}
            </span>
          </div>
        )}

        {trip.description && (
          <p className="text-xs font-light leading-relaxed opacity-80">{trip.description}</p>
        )}

        <button
          type="button"
          onClick={onOpenChronicle}
          className="w-full rounded border border-[#a58452]/20 py-2 text-[9px] font-medium uppercase tracking-widest text-[#a58452] transition-all hover:border-[#a58452]/50 hover:bg-[#a58452]/5"
        >
          Open chronicle
        </button>
      </div>
    </div>
  );
}
