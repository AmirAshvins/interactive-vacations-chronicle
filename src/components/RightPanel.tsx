import { BookOpen, Sliders, X } from 'lucide-react';
import Sketchbook from './Sketchbook';
import SettingsSidebar from './SettingsSidebar';
import type { TravelPin, FlightRoute } from './WorldMap';
import type { CityConfig, SolarState } from '../utils/solarEngine';
import type { Memory } from '../hooks/useTravelogueStore';

export type PanelTab = 'sketchbook' | 'settings';

interface RightPanelProps {
  tab: PanelTab | null;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  isOverlayVisible: boolean;
  isDarkPhase: boolean;
  // Sketchbook
  pins: TravelPin[];
  flights: FlightRoute[];
  onPinSelect: (pin: TravelPin) => void;
  onAddFlight: (fromKey: string, toKey: string) => void;
  onRemoveFlight: (flightId: string) => void;
  memories: Memory[];
  onAddMemory: (pinId: string, title: string, body: string, quote?: string) => void;
  // Settings
  solarState: SolarState;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isTimeOverridden: boolean;
  onToggleTimeOverride: (override: boolean) => void;
  selectedCity: CityConfig;
  onCityChange: (cityKey: string) => void;
  materialMode: 'oak' | 'cork' | 'walnut' | 'auto';
  onMaterialChange: (mode: 'oak' | 'cork' | 'walnut' | 'auto') => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isTvMode: boolean;
  onToggleTvMode: () => void;
}

export default function RightPanel({
  tab,
  onTabChange,
  onClose,
  isOverlayVisible,
  isDarkPhase,
  pins,
  flights,
  onPinSelect,
  onAddFlight,
  onRemoveFlight,
  memories,
  onAddMemory,
  solarState,
  currentTime,
  onTimeChange,
  isTimeOverridden,
  onToggleTimeOverride,
  selectedCity,
  onCityChange,
  materialMode,
  onMaterialChange,
  showGrid,
  onToggleGrid,
  isTvMode,
  onToggleTvMode,
}: RightPanelProps) {
  const isOpen = tab !== null;

  return (
    <div
      className={`right-panel fixed right-6 top-6 bottom-28 z-40 flex w-[min(400px,30vw)] min-w-[320px] flex-col overflow-hidden rounded-2xl border tv-hud-element ${
        isOpen && isOverlayVisible ? 'opacity-100 translate-x-0' : 'tv-hud-hidden-right pointer-events-none'
      } ${isDarkPhase ? 'right-panel-dark' : 'right-panel-light'}`}
      style={{
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}
    >
      {/* Tab bar + close */}
      <div className="right-panel-header flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="right-panel-tabs flex flex-1 gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => onTabChange('sketchbook')}
            className={`right-panel-tab flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-semibold uppercase tracking-widest ${
              tab === 'sketchbook' ? 'right-panel-tab-active' : ''
            }`}
          >
            <BookOpen size={14} />
            Chronicle
          </button>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`right-panel-tab flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-semibold uppercase tracking-widest ${
              tab === 'settings' ? 'right-panel-tab-active' : ''
            }`}
          >
            <Sliders size={14} />
            Study
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="right-panel-close flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'sketchbook' && (
          <Sketchbook
            embedded
            isDarkPhase={isDarkPhase}
            pins={pins}
            flights={flights}
            onPinSelect={onPinSelect}
            onAddFlight={onAddFlight}
            onRemoveFlight={onRemoveFlight}
            memories={memories}
            onAddMemory={onAddMemory}
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
            materialMode={materialMode}
            onMaterialChange={onMaterialChange}
            showGrid={showGrid}
            onToggleGrid={onToggleGrid}
            isTvMode={isTvMode}
            onToggleTvMode={onToggleTvMode}
          />
        )}
      </div>
    </div>
  );
}
