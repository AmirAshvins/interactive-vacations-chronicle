import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Trip } from '../types/travelogue';
import type { MapPinStyleId } from '../data/mapPinStyles';
import { getCountryName, formatTripDuration } from '../utils/countryUtils';
import { SvgMapMarkerMini } from './SvgMapMarker';
import { X } from 'lucide-react';

const ROW_HEIGHT = 64;
const OVERSCAN = 6;

interface PinStackPickerProps {
  trips: Trip[];
  anchorLabel: string;
  mapPinStyle: MapPinStyleId;
  isDarkPhase: boolean;
  onSelect: (trip: Trip) => void;
  onClose: () => void;
}

export default function PinStackPicker({
  trips,
  anchorLabel,
  mapPinStyle,
  isDarkPhase,
  onSelect,
  onClose,
}: PinStackPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(320);

  const sorted = useMemo(
    () =>
      [...trips].sort((a, b) => {
        const ay = a.startYear ?? 0;
        const by = b.startYear ?? 0;
        if (by !== ay) return by - ay;
        return a.name.localeCompare(b.name);
      }),
    [trips],
  );

  const totalHeight = sorted.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    sorted.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleTrips = sorted.slice(startIndex, endIndex);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const syncHeight = () => setViewportHeight(el.clientHeight);
    syncHeight();

    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return createPortal(
    <div
      className="pin-stack-picker-root"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`pin-stack-picker-panel ${isDarkPhase ? 'pin-stack-picker-dark' : 'pin-stack-picker-light'}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a journal at ${anchorLabel}`}
      >
        <div className="pin-stack-picker-header">
          <div>
            <p className="pin-stack-picker-eyebrow">
              {trips.length} {trips.length === 1 ? 'journal' : 'journals'} in this area
            </p>
            <h2 className="pin-stack-picker-title">{anchorLabel}</h2>
          </div>
          <button type="button" className="pin-stack-picker-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div
          ref={listRef}
          className="pin-stack-picker-list"
          tabIndex={-1}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <div className="pin-stack-picker-spacer" style={{ height: totalHeight }}>
            <div
              className="pin-stack-picker-window"
              style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}
            >
              {visibleTrips.map((trip) => {
                const duration = formatTripDuration(trip);
                const year =
                  trip.startYear != null
                    ? trip.endYear != null && trip.endYear !== trip.startYear
                      ? `${trip.startYear}–${trip.endYear}`
                      : `${trip.startYear}`
                    : null;

                return (
                  <button
                    key={trip.id}
                    type="button"
                    className="pin-stack-picker-item"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onSelect(trip)}
                  >
                    <SvgMapMarkerMini trip={trip} pinStyle={mapPinStyle} />
                    <span className="pin-stack-picker-item-copy">
                      <span className="pin-stack-picker-item-name">{trip.name}</span>
                      <span className="pin-stack-picker-item-meta">
                        {getCountryName(trip.countryCode)}
                        {year ? ` · ${year}` : ''}
                        {duration ? ` · ${duration}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
