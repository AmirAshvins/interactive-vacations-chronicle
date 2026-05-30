import { useState, useEffect, useRef } from 'react';
import { CITIES, getSolarState, fetchSolarTimes, calculateSolarTimesMath, getDecimalHoursInTimezone } from './utils/solarEngine';
import type { CityConfig, SolarTimes } from './utils/solarEngine';
import WorldMap from './components/WorldMap';
import type { TravelPin, FlightRoute } from './components/WorldMap';
import RightPanel, { type PanelTab } from './components/RightPanel';
import { useTravelogueStore } from './hooks/useTravelogueStore';
import { getSolarUiTheme, SOLAR_CLOCK_TRANSITION_MS, SOLAR_MANUAL_TRANSITION_MS } from './utils/solarTheme';
import { Clock, Navigation, Sliders } from 'lucide-react';

const INITIAL_PINS: TravelPin[] = [
  {
    id: 'pin-van',
    cityKey: 'vancouver',
    name: 'Vancouver',
    lat: 49.2827,
    lng: -123.1207,
    description: 'A coastal mountain haven where modern architecture meets majestic wilderness.',
    material: 'brass',
  },
  {
    id: 'pin-tor',
    cityKey: 'toronto',
    name: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    description: 'The central anchor city of the Bedrood Azizi Family. Concrete lines and lakefront brick.',
    material: 'copper',
  },
  {
    id: 'pin-teh',
    cityKey: 'tehran',
    name: 'Tehran',
    lat: 35.6892,
    lng: 51.3890,
    description: 'An ancient mountain-framed valley, rich with Persian geometry and modernist architecture.',
    material: 'brass',
  },
];

const INITIAL_FLIGHTS: FlightRoute[] = [
  {
    id: 'f-tor-teh',
    fromCity: 'toronto',
    toCity: 'tehran',
    fromLat: 43.6532,
    fromLng: -79.3832,
    toLat: 35.6892,
    toLng: 51.3890,
  },
  {
    id: 'f-van-tor',
    fromCity: 'vancouver',
    toCity: 'toronto',
    fromLat: 49.2827,
    fromLng: -123.1207,
    toLat: 43.6532,
    toLng: -79.3832,
  },
];

export default function App() {
  const [selectedCity, setSelectedCity] = useState<CityConfig>(CITIES.toronto);
  const [currentTime, setCurrentTime] = useState<number>(12.0);
  const [isTimeOverridden, setIsTimeOverridden] = useState<boolean>(false);

  const [solarTimes, setSolarTimes] = useState<SolarTimes>({
    sunrise: 6.0,
    sunset: 20.5,
    solarNoon: 13.0,
    dayLength: 14.5,
  });

  const [materialMode, setMaterialMode] = useState<'oak' | 'cork' | 'walnut' | 'auto'>('auto');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<PanelTab | null>(null);

  const [isTvMode, setIsTvMode] = useState<boolean>(true);
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(true);

  const [selectedPin, setSelectedPin] = useState<TravelPin | null>(null);

  const travelogue = useTravelogueStore({
    pins: INITIAL_PINS,
    flights: INITIAL_FLIGHTS,
    memories: [],
  });

  const { pins, flights, memories, addFlight, removeFlight, addMemory } = travelogue;

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setSolarTimes(calculateSolarTimesMath(selectedCity));

    fetchSolarTimes(selectedCity).then((times) => {
      if (active) setSolarTimes(times);
    });

    return () => {
      active = false;
    };
  }, [selectedCity]);

  useEffect(() => {
    if (isTimeOverridden) return;

    const tick = () => {
      setCurrentTime(getDecimalHoursInTimezone(new Date(), selectedCity.timezone));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [selectedCity, isTimeOverridden]);

  const solarState = getSolarState(
    currentTime,
    solarTimes,
    materialMode === 'auto' ? 'cork' : materialMode,
  );

  const isDarkPhase = solarState.phase === 'night' || solarState.phase === 'twilight';
  const uiTheme = getSolarUiTheme(solarState.phase);

  useEffect(() => {
    const root = document.documentElement;
    const transitionMs = isTimeOverridden ? SOLAR_MANUAL_TRANSITION_MS : SOLAR_CLOCK_TRANSITION_MS;
    const transition = `${transitionMs}ms ease-in-out`;

    root.style.setProperty('--solar-transition', transition);
    root.style.setProperty('--wall-bg', solarState.bgGradient);
    root.style.setProperty('--shadow-dx', `${solarState.shadowOffset.dx}px`);
    root.style.setProperty('--shadow-dy', `${solarState.shadowOffset.dy}px`);
    root.style.setProperty('--shadow-blur', `${solarState.shadowBlur}px`);
    root.style.setProperty('--shadow-opacity', `${solarState.shadowOpacity}`);
    root.style.setProperty('--spotlight-opacity', `${solarState.spotlightOpacity}`);
    root.style.setProperty('--glow-color', solarState.glowColor);
    root.style.setProperty('--text-color', solarState.textColor);
    root.style.setProperty('--grid-opacity', `${solarState.gridOpacity}`);

    root.style.setProperty('--panel-bg', uiTheme.panelBg);
    root.style.setProperty('--panel-border', uiTheme.panelBorder);
    root.style.setProperty('--panel-text', uiTheme.panelText);
    root.style.setProperty('--panel-muted', uiTheme.panelMuted);
    root.style.setProperty('--panel-surface', uiTheme.panelSurface);
    root.style.setProperty('--dock-bg', uiTheme.dockBg);
    root.style.setProperty('--dock-border', uiTheme.dockBorder);
    root.style.setProperty('--frame-border', uiTheme.frameBorder);
    root.style.setProperty('--frame-shadow', uiTheme.frameShadow);
    root.style.setProperty('--flight-stroke', uiTheme.flightStroke);
    root.style.setProperty('--flight-stroke-width', uiTheme.flightStrokeWidth);
    root.style.setProperty('--flight-plane-fill', uiTheme.flightPlaneFill);
    root.style.setProperty('--flight-plane-stroke', uiTheme.flightPlaneStroke);
    root.style.setProperty('--landmass-stroke', uiTheme.landmassStroke);
    root.style.setProperty('--landmass-stroke-width', uiTheme.landmassStrokeWidth);

    root.classList.toggle('solar-manual-mode', isTimeOverridden);
    root.classList.toggle('solar-clock-mode', !isTimeOverridden);
    root.classList.toggle('solar-dark-phase', solarState.phase === 'night' || solarState.phase === 'twilight');
  }, [solarState, uiTheme, isTimeOverridden]);

  const idleStateRef = useRef({ isTvMode, panelTab, isTimeOverridden, selectedPin });

  idleStateRef.current = { isTvMode, panelTab, isTimeOverridden, selectedPin };

  const scheduleOverlayHide = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = null;

    const { isTvMode: tv, panelTab: tab, isTimeOverridden: overridden, selectedPin: pin } =
      idleStateRef.current;

    if (tv && !tab && !overridden && !pin) {
      idleTimeoutRef.current = setTimeout(() => setIsOverlayVisible(false), 8000);
    }
  };

  const resetIdleTimer = () => {
    setIsOverlayVisible(true);
    scheduleOverlayHide();
  };

  useEffect(() => {
    const wakeEvents = ['mousedown', 'keydown', 'wheel', 'touchstart'] as const;

    const handleWake = () => resetIdleTimer();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelTab(null);
        setSelectedPin(null);
      }
      resetIdleTimer();
    };

    wakeEvents.forEach((event) => window.addEventListener(event, handleWake, { passive: true }));
    window.addEventListener('keydown', handleKey);

    resetIdleTimer();

    return () => {
      wakeEvents.forEach((event) => window.removeEventListener(event, handleWake));
      window.removeEventListener('keydown', handleKey);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isTvMode, panelTab, isTimeOverridden, selectedPin]);

  const openPanel = (tab: PanelTab = 'settings') => {
    setPanelTab((current) => (current === tab ? null : tab));
    resetIdleTimer();
  };

  const handleAddFlightRoute = (fromCity: string, toCity: string) => {
    const fromPin = pins.find((p) => p.cityKey === fromCity);
    const toPin = pins.find((p) => p.cityKey === toCity);
    if (!fromPin || !toPin) return;

    addFlight({
      id: `f-${Date.now()}`,
      fromCity,
      toCity,
      fromLat: fromPin.lat,
      fromLng: fromPin.lng,
      toLat: toPin.lat,
      toLng: toPin.lng,
    });
  };

  const [dustParticles] = useState(() =>
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 20,
      scale: 0.5 + Math.random() * 1.0,
    })),
  );

  const pinSubtitle: Record<string, string> = {
    vancouver: 'The Mountain Haven',
    toronto: 'The Family Anchor',
    tehran: 'The Heritage Cradle',
  };

  return (
    <div className="relative h-full w-full overflow-hidden">

      <WorldMap
        solarState={solarState}
        selectedCity={selectedCity}
        pins={pins}
        flights={flights}
        onPinClick={(pin) => {
          setSelectedPin(pin);
          const config = CITIES[pin.cityKey];
          if (config) setSelectedCity(config);
          resetIdleTimer();
        }}
        showGrid={showGrid}
        materialMode={materialMode}
        onMapClick={resetIdleTimer}
      />

      {solarState.phase === 'night' && (
        <div className="ambient-dust-container">
          {dustParticles.map((p) => (
            <div
              key={p.id}
              className="dust-particle"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                transform: `scale(${p.scale})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Control dock */}
      <div
        className={`control-dock tv-hud-element ${isOverlayVisible ? '' : 'tv-hud-hidden'}`}
      >
        <button
          type="button"
          onClick={() => openPanel(panelTab ?? 'settings')}
          className={`dock-btn dock-btn-settings dock-btn-icon-only ${panelTab ? 'active' : ''}`}
          title="Open settings panel"
          aria-label="Settings"
        >
          <Sliders size={16} />
        </button>
      </div>

      <RightPanel
        tab={panelTab}
        onTabChange={(tab) => {
          setPanelTab(tab);
          resetIdleTimer();
        }}
        onClose={() => {
          setPanelTab(null);
          resetIdleTimer();
        }}
        isOverlayVisible={isOverlayVisible}
        isDarkPhase={isDarkPhase}
        pins={pins}
        flights={flights}
        onPinSelect={(pin) => {
          setSelectedPin(pin);
          const config = CITIES[pin.cityKey];
          if (config) setSelectedCity(config);
          resetIdleTimer();
        }}
        onAddFlight={handleAddFlightRoute}
        onRemoveFlight={removeFlight}
        memories={memories}
        onAddMemory={(pinId, title, body, quote) => addMemory({ pinId, title, body, quote })}
        solarState={solarState}
        currentTime={currentTime}
        onTimeChange={(val) => {
          setCurrentTime(val);
          resetIdleTimer();
        }}
        isTimeOverridden={isTimeOverridden}
        onToggleTimeOverride={(override) => {
          setIsTimeOverridden(override);
          resetIdleTimer();
        }}
        selectedCity={selectedCity}
        onCityChange={(cityKey) => {
          const config = CITIES[cityKey];
          if (config) {
            setSelectedCity(config);
            setSelectedPin(null);
          }
          resetIdleTimer();
        }}
        materialMode={materialMode}
        onMaterialChange={(mode) => {
          setMaterialMode(mode);
          resetIdleTimer();
        }}
        showGrid={showGrid}
        onToggleGrid={() => {
          setShowGrid(!showGrid);
          resetIdleTimer();
        }}
        isTvMode={isTvMode}
        onToggleTvMode={() => {
          setIsTvMode(!isTvMode);
          resetIdleTimer();
        }}
      />

      {/* Pin detail card */}
      {selectedPin && !panelTab && (
        <div
          className={`watercolor-card tv-hud-element fixed right-[max(1.5rem,calc(min(400px,30vw)+2.5rem))] top-8 z-40 flex w-[min(320px,26vw)] flex-col gap-4 rounded-lg border border-black/5 p-6 shadow-2xl transition-all duration-700 ${
            isOverlayVisible ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 tv-hud-hidden-right'
          }`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3
                className="text-lg font-medium text-[#2c2c2a]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {selectedPin.name}
              </h3>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#a58452]">
                {pinSubtitle[selectedPin.cityKey] || 'Memorable Destination'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPin(null);
                resetIdleTimer();
              }}
              className="rounded-full p-1.5 text-[#7c7c78] transition-colors hover:bg-black/5 hover:text-[#2c2c2a]"
            >
              <XIcon size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#7c7c78]">
              <Navigation size={9} />
              <span>
                {selectedPin.lat.toFixed(4)}° N, {Math.abs(selectedPin.lng).toFixed(4)}°{' '}
                {selectedPin.lng < 0 ? 'W' : 'E'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#7c7c78]">
              <Clock size={9} />
              <span>{CITIES[selectedPin.cityKey]?.timezone}</span>
            </div>
          </div>

          <div className="relative flex h-28 items-center justify-center overflow-hidden rounded border border-black/5 bg-[#f4f3ec]">
            <span
              className="select-none text-2xl font-light uppercase tracking-[0.25em] text-[#2c2c2a]/20"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {selectedPin.name}
            </span>
          </div>

          <p className="text-xs font-light leading-relaxed text-[#5c5c58]">
            {selectedPin.description}
          </p>

          {memories.filter((m) => m.pinId === selectedPin.id).map((mem) => (
            <div key={mem.id} className="border-l-2 border-[#a58452]/25 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a58452]">{mem.title}</p>
              <p className="mt-1 text-xs font-light leading-relaxed text-[#5c5c58]">{mem.body}</p>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setPanelTab('sketchbook');
              setSelectedPin(null);
              resetIdleTimer();
            }}
            className="w-full rounded border border-[#a58452]/20 py-2 text-[9px] font-medium uppercase tracking-widest text-[#a58452] transition-all hover:border-[#a58452]/50 hover:bg-[#a58452]/5"
          >
            Read journal entry
          </button>
        </div>
      )}
    </div>
  );
}

function XIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
