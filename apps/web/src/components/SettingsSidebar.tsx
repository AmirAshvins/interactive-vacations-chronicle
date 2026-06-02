import React from 'react';
import { CITIES } from '../utils/solarEngine';
import type { CityConfig, SolarState } from '../utils/solarEngine';
import { Sun, Moon, Clock, Layers, MapPin, X, Plane, Globe } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import HomeCityPicker from './HomeCityPicker';
import EnvironmentControls from './EnvironmentControls';
import { MAP_PIN_STYLES, type MapPinStyleId } from '../data/mapPinStyles';

interface SettingsSidebarProps {
  embedded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  solarState: SolarState;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isTimeOverridden: boolean;
  onToggleTimeOverride: (override: boolean) => void;
  selectedCity: CityConfig;
  onCityChange: (cityKey: string) => void;
  homeCityKey: string;
  onHomeCityChange: (cityKey: string) => void;
  countryCodes: string[];
  materialMode: 'oak' | 'cork' | 'walnut' | 'auto';
  onMaterialChange: (mode: 'oak' | 'cork' | 'walnut' | 'auto') => void;
  showFlightPaths?: boolean;
  onToggleFlightPaths?: () => void;
  highlightVisited?: boolean;
  onToggleHighlightVisited?: () => void;
  mapPinStyle?: MapPinStyleId;
  onMapPinStyleChange?: (style: MapPinStyleId) => void;
  isOverlayVisible?: boolean;
  readOnly?: boolean;
}

export default function SettingsSidebar({
  embedded = false,
  isOpen = true,
  onClose,
  solarState,
  currentTime,
  onTimeChange,
  isTimeOverridden,
  onToggleTimeOverride,
  selectedCity,
  onCityChange,
  homeCityKey,
  onHomeCityChange,
  countryCodes,
  materialMode,
  onMaterialChange,
  showFlightPaths = true,
  onToggleFlightPaths,
  highlightVisited = true,
  onToggleHighlightVisited,
  mapPinStyle = 'needle-red',
  onMapPinStyleChange,
  isOverlayVisible = true,
}: SettingsSidebarProps) {
  
  // Format decimal hour to HH:MM format
  const formatTime = (decimalTime: number) => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.floor((decimalTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseFloat(e.target.value));
  };

  const isDarkPhase = solarState.phase === 'night' || solarState.phase === 'twilight';

  const body = (
    <div className="settings-embedded flex h-full min-h-0 flex-col overflow-hidden">
      <div className="settings-embedded-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain scroll-container p-5">
        
        {/* WIDGET 1: LOCATION CALIBRATION */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <MapPin size={9} className="text-[#a58452]" />
            <span>Location Calibration</span>
          </div>
          
          <div className={`p-4 rounded-2xl border flex flex-col gap-4 ${
            isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
          }`}>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-widest font-sans font-semibold opacity-50">Target Center</span>
              
              {/* Sleek Segmented Capsule Toggles (No Dropdowns!) */}
              <div className={`flex gap-1 p-1 rounded-full border ${isDarkPhase ? 'bg-[#000000]/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                {Object.values(CITIES).map((c) => {
                  const isSelected = selectedCity.name === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => onCityChange(c.name)}
                      className={`flex-1 py-1.5 px-2 rounded-full text-[8.5px] uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#a58452] text-white shadow-sm'
                          : isDarkPhase
                            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-black/5'
                      }`}
                    >
                      {c.displayName.split(',')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 border-t pt-3 border-black/5 dark:border-white/5 text-[9px] font-mono opacity-50">
              <div className="flex justify-between">
                <span>LATITUDE</span>
                <span>{selectedCity.lat.toFixed(4)}° N</span>
              </div>
              <div className="flex justify-between">
                <span>LONGITUDE</span>
                <span>{Math.abs(selectedCity.lng).toFixed(4)}° W</span>
              </div>
              <div className="flex justify-between">
                <span>TIMEZONE MERIDIAN</span>
                <span>{selectedCity.timezone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <Plane size={9} className="text-[#a58452]" />
            <span>Home Origin</span>
          </div>

          <div className={`rounded-2xl border p-4 ${
            isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
          }`}>
            <p className="mb-3 text-[10px] font-light leading-relaxed opacity-60">
              Flight arcs draw from your home city to each journal entry automatically.
            </p>
            <HomeCityPicker
              homeCityKey={homeCityKey}
              countryCodes={countryCodes}
              isDarkPhase={isDarkPhase}
              onHomeCityChange={onHomeCityChange}
            />
          </div>
        </div>

        {/* WIDGET 2: SUNLIGHT STUDY (SUN DIAL SLIDER) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <Clock size={9} className="text-[#a58452]" />
            <span>Daylight Sun Dial</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col gap-4.5 ${
            isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase tracking-widest font-sans font-semibold opacity-50">Solar Lock</span>
              <button
                onClick={() => onToggleTimeOverride(!isTimeOverridden)}
                className={`text-[8px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all duration-150 font-semibold cursor-pointer ${
                  isTimeOverridden 
                    ? 'bg-[#a58452]/20 text-[#a58452] border-[#a58452]/30 shadow-[inset_0_1px_3px_rgba(165,132,82,0.1)]' 
                    : isDarkPhase 
                      ? 'text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-white/5' 
                      : 'text-neutral-500 border-neutral-300 hover:text-neutral-800 hover:bg-black/5'
                }`}
              >
                {isTimeOverridden ? 'Manual Dials' : 'Follow Clock'}
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3.5 justify-between">
                <Sun size={12} className={`opacity-40 transition-colors duration-150 ${isTimeOverridden ? 'text-[#a58452]' : ''}`} />
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.1"
                  value={currentTime}
                  onChange={handleSliderChange}
                  disabled={!isTimeOverridden}
                  className={`flex-1 ${!isTimeOverridden ? 'opacity-20 cursor-not-allowed' : ''}`}
                />
                <Moon size={12} className={`opacity-40 transition-colors duration-150 ${isTimeOverridden ? 'text-[#a58452]' : ''}`} />
              </div>
              
              <div className="flex flex-col gap-1 mt-1">
                {/* Horizontal time intervals */}
                <div className="flex justify-between text-[7.5px] uppercase tracking-widest opacity-35 font-mono px-0.5">
                  <span>00h</span>
                  <span>06h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>24h</span>
                </div>
                <div className="flex justify-between items-center text-[9.5px] font-mono opacity-50 mt-1 border-t border-black/5 dark:border-white/5 pt-2">
                  <span>CURRENT SOLAR ALTITUDE</span>
                  <span className="font-semibold text-[#a58452] text-xs">{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 3: MATERIAL AESTHETICS */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <Layers size={9} className="text-[#a58452]" />
            <span>Material Aesthetics</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
            isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
          }`}>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-widest font-sans font-semibold opacity-50">Timber Material</span>
              
              {/* Segmented Toggles for Material (No dropdowns!) */}
              <div className={`flex gap-1 p-1 rounded-full border ${isDarkPhase ? 'bg-[#000000]/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                {(['auto', 'oak', 'cork', 'walnut'] as const).map((mode) => {
                  const isSelected = materialMode === mode;
                  const labels: Record<string, string> = {
                    auto: 'Auto',
                    oak: 'Oak',
                    cork: 'Cork',
                    walnut: 'Walnut'
                  };
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onMaterialChange(mode)}
                      className={`flex-1 py-1.5 px-0.5 rounded-full text-[8.5px] uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#a58452] text-white shadow-sm'
                          : isDarkPhase
                            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-black/5'
                      }`}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="text-[8.5px] font-sans opacity-35 leading-relaxed font-light mt-1">
              * Auto Sync automatically swaps the timber material matching the daylight study phase (Walnut at night, Cork/Oak in daylight).
            </div>
          </div>
        </div>

        {/* WIDGET 4: ENVIRONMENT & DISPLAY */}
        <EnvironmentControls isDarkPhase={isDarkPhase} />

        {/* WIDGET 5: MAP PIN STYLE */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <MapPin size={9} className="text-[#a58452]" />
            <span>Map Pins</span>
          </div>
          <div
            className={`grid grid-cols-2 gap-2 rounded-2xl border p-3 ${
              isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
            }`}
          >
            {MAP_PIN_STYLES.map((style) => {
              const selected = mapPinStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onMapPinStyleChange?.(style.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                    selected
                      ? 'border-[#a58452] bg-[#a58452]/12'
                      : isDarkPhase
                        ? 'border-white/5 hover:border-white/15'
                        : 'border-black/5 hover:border-black/10'
                  }`}
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-wider">
                    {style.label}
                  </span>
                  <span className="mt-0.5 block text-[8px] font-light leading-snug opacity-45">
                    {style.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* WIDGET 6: MAP OVERLAYS */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            <Globe size={9} className="text-[#a58452]" />
            <span>Map Overlays</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col gap-4.5 ${
            isDarkPhase ? 'bg-black/10 border-white/5' : 'bg-[#fcfbf9]/60 border-black/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-light uppercase tracking-wider opacity-80">
                <Plane size={11} className="opacity-40" />
                <span>Flight Paths</span>
              </div>
              <ToggleSwitch
                checked={showFlightPaths}
                onChange={() => onToggleFlightPaths?.()}
                label="Flight Paths"
              />
            </div>

            <div className="flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-light uppercase tracking-wider opacity-80">
                <Globe size={11} className="opacity-40" />
                <span>Visited Countries</span>
              </div>
              <ToggleSwitch
                checked={highlightVisited}
                onChange={() => onToggleHighlightVisited?.()}
                label="Visited Countries"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <div
      className={`fixed right-8 top-8 bottom-28 z-40 flex w-[min(340px,28vw)] flex-col overflow-hidden rounded-2xl border tv-hud-element ${
        isOpen && isOverlayVisible ? 'opacity-100 translate-x-0' : 'tv-hud-hidden-right pointer-events-none'
      } ${
        isDarkPhase
          ? 'border-white/5 bg-[#121214]/88 text-neutral-200'
          : 'border-black/5 bg-white/88 text-[#2c2c2a]'
      }`}
      style={{ backdropFilter: 'blur(32px)' }}
    >
      <div className={`flex items-center justify-between border-b p-6 ${isDarkPhase ? 'border-white/5' : 'border-black/5'}`}>
        <div>
          <h2 className="text-xl font-extralight tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>
            Configurations
          </h2>
          <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.3em] opacity-40">
            Astronomical & Material Study
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full p-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        )}
      </div>
      {body}
    </div>
  );
}
