import { useState } from 'react';
import type { Trip, FlightRoute } from '../types/travelogue';
import type { HomeOrigin } from '../utils/flightRoutes';
import type { TripImageChanges } from '../hooks/useTravelogueStore';
import type { ChronicleImportResult } from './ChronicleImportDialog';
import TripDialog, { sortCountryOptions } from './TripDialog';
import ChronicleTransfer from './ChronicleTransfer';
import VirtualChronicleList from './VirtualChronicleList';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { Award, Compass, Plus } from 'lucide-react';

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
  onAddTrip: (trip: Trip, imageChanges?: TripImageChanges) => void;
  onUpdateTrip: (trip: Trip, imageChanges?: TripImageChanges) => void;
  onRemoveTrip: (id: string) => void;
  onImportTrips: (result: ChronicleImportResult) => void;
  isOverlayVisible?: boolean;
}

function MobileDiagnostics({
  uniqueCountries,
  tripCount,
  flightCount,
  homeOrigin,
  isDarkPhase,
  dividerClass,
}: {
  uniqueCountries: number;
  tripCount: number;
  flightCount: number;
  homeOrigin: HomeOrigin | null;
  isDarkPhase: boolean;
  dividerClass: string;
}) {
  const statClass = isDarkPhase
    ? 'rounded-lg border border-white/8 bg-black/15 px-2 py-1.5 text-center'
    : 'rounded-lg border border-black/6 bg-white/70 px-2 py-1.5 text-center';

  return (
    <div className="mb-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[7px] font-semibold uppercase tracking-[0.2em] opacity-45">
        <Award size={8} className="text-[#a58452]" />
        <span>Journey</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className={statClass}>
          <span className="block text-[7px] uppercase tracking-wider opacity-50">Countries</span>
          <span className={`text-sm font-light leading-tight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
            {uniqueCountries}
          </span>
        </div>
        <div className={statClass}>
          <span className="block text-[7px] uppercase tracking-wider opacity-50">Trips</span>
          <span className={`text-sm font-light leading-tight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
            {tripCount}
          </span>
        </div>
        <div className={statClass}>
          <span className="block text-[7px] uppercase tracking-wider opacity-50">Arcs</span>
          <span className={`text-sm font-light leading-tight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
            {flightCount}
          </span>
        </div>
      </div>
      {homeOrigin && (
        <p className={`truncate border-t pt-1.5 text-[8px] font-mono uppercase tracking-widest text-[#a58452]/75 ${dividerClass}`}>
          Origin: {homeOrigin.name}
        </p>
      )}
    </div>
  );
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
  const { mobileLayout } = useEnvironmentContext();
  const compactMobilePanel = embedded && mobileLayout;

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

  const chronicleBody = (
    <div
      className={
        embedded
          ? 'sketchbook-embedded flex h-full min-h-0 flex-col overflow-hidden'
          : 'flex h-full min-h-0 flex-col'
      }
    >
      <div className={`shrink-0 ${compactMobilePanel ? 'px-4 pb-2 pt-3' : 'p-5 pb-0'}`}>
        {compactMobilePanel ? (
          <MobileDiagnostics
            uniqueCountries={uniqueCountries}
            tripCount={trips.length}
            flightCount={flights.length}
            homeOrigin={homeOrigin}
            isDarkPhase={isDarkPhase}
            dividerClass={dividerClass}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <div className={sectionLabelClass}>
              <Award size={9} className="text-[#a58452]" />
              <span>Journey Diagnostics</span>
            </div>
            <div className={`mt-1 flex items-center justify-between border-y py-4 font-sans ${dividerClass}`}>
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-semibold uppercase tracking-widest opacity-50">Countries</span>
                <span className={`mt-1 text-xl font-extralight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
                  {uniqueCountries}
                </span>
              </div>
              <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-semibold uppercase tracking-widest opacity-50">Journeys</span>
                <span className={`mt-1 text-xl font-extralight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
                  {trips.length}
                </span>
              </div>
              <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-semibold uppercase tracking-widest opacity-50">Flight arcs</span>
                <span className={`mt-1 text-xl font-extralight ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>
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
        )}

        <div className={compactMobilePanel ? 'flex items-center justify-between' : 'mt-5 flex items-center justify-between'}>
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
      </div>

      <div
        className={`sketchbook-chronicle-region flex min-h-0 flex-1 flex-col overflow-hidden pb-1 ${
          compactMobilePanel ? 'px-4 pt-1' : 'pl-5 pr-2 pt-3'
        }`}
      >
        <VirtualChronicleList
          trips={trips}
          isDarkPhase={isDarkPhase}
          flightTripIds={flightTripIds}
          homeOrigin={homeOrigin}
          onTripSelect={onTripSelect}
          onEditTrip={openEditTrip}
          emptyState={
            <div className={`rounded-2xl border border-dashed py-8 text-center text-[10px] uppercase tracking-widest opacity-50 ${cardClass}`}>
              No journeys yet — add your first trip
            </div>
          }
        />
      </div>

      <div
        className={`sketchbook-archive shrink-0 border-t ${
          compactMobilePanel ? 'px-4 py-2.5' : 'p-5 pt-4'
        } ${dividerClass}`}
      >
        <ChronicleTransfer
          trips={trips}
          isDarkPhase={isDarkPhase}
          compact={compactMobilePanel}
          onImport={onImportTrips}
        />
      </div>

      <TripDialog
        open={dialogOpen}
        trip={editingTrip}
        countryOptions={countryOptions}
        isDarkPhase={isDarkPhase}
        onSave={(t, imageChanges) => (editingTrip ? onUpdateTrip(t, imageChanges) : onAddTrip(t, imageChanges))}
        onDelete={editingTrip ? onRemoveTrip : undefined}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );

  if (embedded) return chronicleBody;

  return (
    <div
      className={`fixed left-8 top-8 bottom-28 z-40 flex w-[min(380px,30vw)] flex-col overflow-hidden rounded-2xl border tv-hud-element ${
        isOpen && isOverlayVisible ? 'opacity-100 translate-x-0' : 'tv-hud-hidden-left pointer-events-none'
      } ${isDarkPhase ? 'border-white/5 bg-[#121214]/88 text-neutral-200' : 'border-black/6 bg-[#faf9f6]/92'}`}
    >
      {chronicleBody}
      {onClose && (
        <button type="button" onClick={onClose} className="sr-only">
          Close
        </button>
      )}
    </div>
  );
}
