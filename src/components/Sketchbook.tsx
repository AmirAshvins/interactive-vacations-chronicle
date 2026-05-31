import { useState } from 'react';
import type { Trip, FlightRoute } from '../types/travelogue';
import type { HomeOrigin } from '../utils/flightRoutes';
import { getCountryName, formatTripDuration } from '../utils/countryUtils';
import ImageCarousel from './ImageCarousel';
import TripDialog, { sortCountryOptions } from './TripDialog';
import ChronicleTransfer from './ChronicleTransfer';
import { Award, Compass, Plane, Plus, Pencil } from 'lucide-react';

interface SketchbookProps {
  embedded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isDarkPhase?: boolean;
  trips: Trip[];
  flights: FlightRoute[];
  homeOrigin: HomeOrigin | null;
  countryCodes: string[];
  onTripSelect: (trip: Trip) => void;
  onAddTrip: (trip: Trip) => void;
  onUpdateTrip: (trip: Trip) => void;
  onRemoveTrip: (id: string) => void;
  onImportTrips: (trips: Trip[]) => void;
  isOverlayVisible?: boolean;
}

export default function Sketchbook({
  embedded = false,
  isOpen = true,
  onClose,
  isDarkPhase = false,
  trips,
  flights,
  homeOrigin,
  countryCodes,
  onTripSelect,
  onAddTrip,
  onUpdateTrip,
  onRemoveTrip,
  onImportTrips,
  isOverlayVisible = true,
}: SketchbookProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const countryOptions = sortCountryOptions(countryCodes.length ? countryCodes : ['ca', 'us', 'ir']);

  const cardClass = isDarkPhase
    ? 'bg-black/10 border-white/5'
    : 'bg-[#fcfbf9]/60 border-black/5';

  const sectionLabelClass =
    'flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans';

  const dividerClass = isDarkPhase ? 'border-white/5' : 'border-black/5';

  const uniqueCountries = new Set(trips.map((t) => t.countryCode.toLowerCase())).size;
  const flightTripIds = new Set(flights.map((f) => f.toTripId));

  const openNewTrip = () => {
    setEditingTrip(null);
    setDialogOpen(true);
  };

  const openEditTrip = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setDialogOpen(true);
  };

  const body = (
    <>
      <div className="flex h-full flex-col overflow-y-auto p-5 scroll-container gap-5">
        <div className="flex flex-col gap-2">
          <div className={sectionLabelClass}>
            <Award size={9} className="text-[#a58452]" />
            <span>Journey Diagnostics</span>
          </div>
          <div className={`flex justify-between items-center py-4 border-y font-sans mt-1 ${dividerClass}`}>
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Countries</span>
              <span className={`text-xl font-extralight mt-1 ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
                {uniqueCountries}
              </span>
            </div>
            <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Journeys</span>
              <span className={`text-xl font-extralight mt-1 ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
                {trips.length}
              </span>
            </div>
            <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Flight arcs</span>
              <span className={`text-xl font-extralight mt-1 ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
                {flights.length}
              </span>
            </div>
          </div>
          {homeOrigin && (
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#a58452]/80">
              Origin: {homeOrigin.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className={sectionLabelClass}>
              <Compass size={9} className="text-[#a58452]" />
              <span>Chronicle Logs</span>
            </div>
            <button
              type="button"
              onClick={openNewTrip}
              className="flex items-center gap-1.5 rounded-full bg-[#a58452] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-white hover:bg-[#b59563]"
            >
              <Plus size={11} />
              Add
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {trips.map((trip, idx) => {
              const duration = formatTripDuration(trip);
              const hasFlight = flightTripIds.has(trip.id);
              return (
                <div
                  key={trip.id}
                  onClick={() => onTripSelect(trip)}
                  className={`group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border p-4 transition-all duration-150 ${
                    isDarkPhase
                      ? 'border-transparent bg-black/10 hover:border-white/5 hover:bg-black/20'
                      : 'border-transparent bg-[#fcfbf9]/50 hover:border-black/5 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] origin-center scale-y-0 bg-[#a58452] transition-transform duration-150 group-hover:scale-y-100" />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8.5px] font-mono font-semibold uppercase tracking-widest text-[#a58452]">
                      [ LOG {String(idx + 1).padStart(2, '0')} ]
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
                      <button
                        type="button"
                        onClick={(e) => openEditTrip(trip, e)}
                        className={`rounded-full p-1.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                          isDarkPhase ? 'hover:bg-white/10' : 'hover:bg-black/5'
                        }`}
                        aria-label="Edit journey"
                      >
                        <Pencil size={11} />
                      </button>
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

                  {trip.images.length > 0 && (
                    <ImageCarousel
                      images={trip.images}
                      alt={trip.name}
                      isDarkPhase={isDarkPhase}
                      compact
                    />
                  )}

                  {trip.description && (
                    <p className={`text-[11.5px] font-light leading-relaxed line-clamp-3 ${isDarkPhase ? 'text-neutral-400' : 'text-[#5c5c58]'}`}>
                      {trip.description}
                    </p>
                  )}
                </div>
              );
            })}

            {trips.length === 0 && (
              <div className={`rounded-2xl border border-dashed py-8 text-center text-[10px] uppercase tracking-widest opacity-50 ${cardClass}`}>
                No journeys yet — add your first trip
              </div>
            )}
          </div>
        </div>

        <div className={`border-t pt-6 ${dividerClass}`}>
          <ChronicleTransfer
            trips={trips}
            isDarkPhase={isDarkPhase}
            onImport={onImportTrips}
          />
        </div>
      </div>

      <TripDialog
        open={dialogOpen}
        trip={editingTrip}
        countryOptions={countryOptions}
        isDarkPhase={isDarkPhase}
        onSave={(t) => (editingTrip ? onUpdateTrip(t) : onAddTrip(t))}
        onDelete={editingTrip ? onRemoveTrip : undefined}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );

  if (embedded) return body;

  return (
    <div
      className={`fixed left-8 top-8 bottom-28 z-40 flex w-[min(380px,30vw)] flex-col overflow-hidden rounded-2xl border tv-hud-element ${
        isOpen && isOverlayVisible ? 'opacity-100 translate-x-0' : 'tv-hud-hidden-left pointer-events-none'
      } ${isDarkPhase ? 'border-white/5 bg-[#121214]/88 text-neutral-200' : 'border-black/6 bg-[#faf9f6]/92'}`}
    >
      {body}
      {onClose && (
        <button type="button" onClick={onClose} className="sr-only">
          Close
        </button>
      )}
    </div>
  );
}
