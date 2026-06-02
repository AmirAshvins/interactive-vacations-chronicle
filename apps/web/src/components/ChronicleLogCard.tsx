import { memo } from 'react';
import type { Trip } from '../types/travelogue';
import type { HomeOrigin } from '../utils/flightRoutes';
import { getCountryName, formatTripDuration } from '../utils/countryUtils';
import TripImages from './TripImages';
import { Plane, Pencil } from 'lucide-react';

interface ChronicleLogCardProps {
  trip: Trip;
  index: number;
  isDarkPhase: boolean;
  isTvFocused?: boolean;
  hasFlight: boolean;
  homeOrigin: HomeOrigin | null;
  onSelect: (trip: Trip) => void;
  onEdit?: (trip: Trip, e: React.MouseEvent) => void;
}

function ChronicleLogCard({
  trip,
  index,
  isDarkPhase,
  isTvFocused = false,
  hasFlight,
  homeOrigin,
  onSelect,
  onEdit,
}: ChronicleLogCardProps) {
  const duration = formatTripDuration(trip);
  const hasImages = (trip.imageIds?.length ?? 0) > 0;

  return (
    <div
      onClick={() => onSelect(trip)}
      className={`group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border p-4 transition-all duration-150 ${
        isTvFocused ? 'tv-focused chronicle-log-tv-focused' : ''
      } ${
        isDarkPhase
          ? 'border-transparent bg-black/10 hover:border-white/5 hover:bg-black/20'
          : 'border-transparent bg-[#fcfbf9]/50 hover:border-black/5 hover:bg-white hover:shadow-md'
      }`}
    >
      <div className="absolute bottom-0 left-0 top-0 w-[2px] origin-center scale-y-0 bg-[#a58452] transition-transform duration-150 group-hover:scale-y-100" />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[8.5px] font-mono font-semibold uppercase tracking-widest text-[#a58452]">
          [ LOG {String(index + 1).padStart(2, '0')} ]
        </span>
        <div className="flex items-center gap-1">
          {hasFlight && homeOrigin && (
            <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-[#a58452]/70">
              <Plane size={9} className="rotate-45" />
              {homeOrigin.name} ⟶
            </span>
          )}
          <span className="text-[8px] uppercase tracking-wider opacity-40">
            {getCountryName(trip.countryCode)}
          </span>
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => onEdit(trip, e)}
              className={`chronicle-log-edit shrink-0 ${isDarkPhase ? 'chronicle-log-edit--dark' : 'chronicle-log-edit--light'}`}
              aria-label="Edit journey"
            >
              <Pencil size={13} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <span
        className={`text-lg font-light ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {trip.name}
      </span>

      {duration && (
        <span className="-mt-1 text-[9px] font-mono uppercase tracking-widest text-[#a58452] opacity-70">
          {duration}
        </span>
      )}

      {hasImages && (
        <TripImages
          imageIds={trip.imageIds}
          alt={trip.name}
          isDarkPhase={isDarkPhase}
          compact
        />
      )}

      {trip.description && (
        <p
          className={`text-[11.5px] font-light leading-relaxed line-clamp-3 ${isDarkPhase ? 'text-neutral-400' : 'text-[#5c5c58]'}`}
        >
          {trip.description}
        </p>
      )}
    </div>
  );
}

export default memo(ChronicleLogCard);

function estimateCardHeight(trip: Trip): number {
  let height = 108;
  if (trip.description) height += 52;
  if ((trip.imageIds?.length ?? 0) > 0) height += 124;
  if (trip.startYear || trip.endYear) height += 18;
  return height;
}

export { estimateCardHeight };
