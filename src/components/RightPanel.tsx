import { BookOpen, Sliders, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTvFocus } from '../context/TvFocusContext';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { panelHudVisibilityClasses } from '../utils/panelVisibility';
import Sketchbook from './Sketchbook';
import SettingsSidebar from './SettingsSidebar';
import type { Trip, FlightRoute } from '../types/travelogue';
import type { ChronicleImportResult } from './ChronicleImportDialog';
import type { TripImageChanges } from '../hooks/useTravelogueStore';
import type { CityConfig, SolarState } from '../utils/solarEngine';
import type { HomeOrigin } from '../utils/flightRoutes';

export type PanelTab = 'sketchbook' | 'settings';

interface RightPanelProps {
  tab: PanelTab | null;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  isOverlayVisible: boolean;
  isDarkPhase: boolean;
  trips: Trip[];
  flights: FlightRoute[];
  homeOrigin: HomeOrigin | null;
  countryCodes: string[];
  onTripSelect: (trip: Trip) => void;
  onAddTrip: (trip: Trip, imageChanges?: TripImageChanges) => void;
  onUpdateTrip: (trip: Trip, imageChanges?: TripImageChanges) => void;
  onRemoveTrip: (id: string) => void;
  onImportTrips: (result: ChronicleImportResult) => void;
  solarState: SolarState;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isTimeOverridden: boolean;
  onToggleTimeOverride: (override: boolean) => void;
  selectedCity: CityConfig;
  onCityChange: (cityKey: string) => void;
  homeCityKey: string;
  onHomeCityChange: (cityKey: string) => void;
  materialMode: 'oak' | 'cork' | 'walnut' | 'auto';
  onMaterialChange: (mode: 'oak' | 'cork' | 'walnut' | 'auto') => void;
  showFlightPaths: boolean;
  onToggleFlightPaths: () => void;
  highlightVisited: boolean;
  onToggleHighlightVisited: () => void;
}

export default function RightPanel({
  tab,
  onTabChange,
  onClose,
  isOverlayVisible,
  isDarkPhase,
  trips,
  flights,
  homeOrigin,
  countryCodes,
  onTripSelect,
  onAddTrip,
  onUpdateTrip,
  onRemoveTrip,
  onImportTrips,
  solarState,
  currentTime,
  onTimeChange,
  isTimeOverridden,
  onToggleTimeOverride,
  selectedCity,
  onCityChange,
  homeCityKey,
  onHomeCityChange,
  materialMode,
  onMaterialChange,
  showFlightPaths,
  onToggleFlightPaths,
  highlightVisited,
  onToggleHighlightVisited,
}: RightPanelProps) {
  const isOpen = tab !== null;
  const isVisible = isOpen && isOverlayVisible;
  const tv = useTvFocus();
  const { mobileLayout } = useEnvironmentContext();
  const hudVisibility = panelHudVisibilityClasses(mobileLayout, isOpen, isOverlayVisible);

  const sheetDrag = useBottomSheetDrag({
    enabled: mobileLayout && isVisible,
    onDismiss: onClose,
  });

  useEffect(() => {
    if (!isVisible) sheetDrag.reset();
  }, [isVisible, sheetDrag.reset]);

  const sheetTransform =
    mobileLayout && isVisible
      ? `translateY(${sheetDrag.offsetY}px)`
      : undefined;

  return (
    <div
      className={`right-panel fixed right-6 top-6 bottom-28 z-40 flex w-[min(400px,30vw)] min-w-[320px] flex-col overflow-hidden rounded-2xl border tv-hud-element ${hudVisibility} ${
        sheetDrag.isDragging ? 'right-panel--dragging' : ''
      } ${isDarkPhase ? 'right-panel-dark' : 'right-panel-light'}`}
      style={{
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        transform: sheetTransform,
        transition: sheetDrag.isDragging ? 'none' : undefined,
      }}
    >
      <div
        className={`right-panel-drag-zone shrink-0 touch-none ${mobileLayout ? '' : 'hidden'}`}
        onPointerDown={sheetDrag.onPointerDown}
        onPointerMove={sheetDrag.onPointerMove}
        onPointerUp={sheetDrag.onPointerUp}
        onPointerCancel={sheetDrag.onPointerCancel}
        aria-label="Drag down to close"
      >
        <div className="right-panel-sheet-handle" aria-hidden />
      </div>

      <div className="right-panel-header flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="right-panel-tabs flex flex-1 gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => onTabChange('sketchbook')}
            className={`right-panel-tab flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-semibold uppercase tracking-widest ${
              tab === 'sketchbook' ? 'right-panel-tab-active' : ''
            } ${tv.isPanelTabFocused(0) ? 'tv-focused' : ''}`}
          >
            <BookOpen size={14} />
            Chronicle
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`right-panel-tab flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-semibold uppercase tracking-widest ${
              tab === 'settings' ? 'right-panel-tab-active' : ''
            } ${tv.isPanelTabFocused(1) ? 'tv-focused' : ''}`}
          >
            <Sliders size={14} />
            Settings
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`right-panel-close flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            tv.enabled && tv.state.zone === 'panel-header' ? 'tv-focused' : ''
          }`}
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="right-panel-body min-h-0 flex-1 overflow-hidden">
        {tab === 'sketchbook' && (
          <Sketchbook
            embedded
            isDarkPhase={isDarkPhase}
            trips={trips}
            flights={flights}
            homeOrigin={homeOrigin}
            countryCodes={countryCodes}
            onTripSelect={onTripSelect}
            onAddTrip={onAddTrip}
            onUpdateTrip={onUpdateTrip}
            onRemoveTrip={onRemoveTrip}
            onImportTrips={onImportTrips}
          />
        )}
        {tab === 'settings' && (
          <SettingsSidebar
            embedded
            solarState={solarState}
            currentTime={currentTime}
            onTimeChange={onTimeChange}
            isTimeOverridden={isTimeOverridden}
            onToggleTimeOverride={onToggleTimeOverride}
            selectedCity={selectedCity}
            onCityChange={onCityChange}
            homeCityKey={homeCityKey}
            onHomeCityChange={onHomeCityChange}
            countryCodes={countryCodes}
            materialMode={materialMode}
            onMaterialChange={onMaterialChange}
            showFlightPaths={showFlightPaths}
            onToggleFlightPaths={onToggleFlightPaths}
            highlightVisited={highlightVisited}
            onToggleHighlightVisited={onToggleHighlightVisited}
          />
        )}
      </div>
    </div>
  );
}
