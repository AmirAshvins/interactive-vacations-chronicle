import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CITIES,
  getSolarState,
  fetchSolarTimes,
  calculateSolarTimesMath,
  getDecimalHoursInTimezone,
} from './utils/solarEngine';
import type { CityConfig, SolarTimes } from './utils/solarEngine';
import type { Trip } from './types/travelogue';
import WorldMap from './components/WorldMap';
import RightPanel, { type PanelTab } from './components/RightPanel';
import TripDetailCard, { type TripCardLayout } from './components/TripDetailCard';
import { pinAnchoredCardPosition } from './utils/tripCardPosition';
import { deriveJournalFlights, getHomeOrigin } from './utils/flightRoutes';
import { useTravelogueStore } from './hooks/useTravelogueStore';
import { useAppSettings } from './hooks/useAppSettings';
import { getSolarUiTheme, SOLAR_CLOCK_TRANSITION_MS, SOLAR_MANUAL_TRANSITION_MS } from './utils/solarTheme';
import { EnvironmentProvider, useEnvironmentContext } from './context/EnvironmentContext';
import { TvFocusProvider } from './context/TvFocusContext';
import EnvironmentDebugBar from './components/EnvironmentDebugBar';
import ControlDock from './components/ControlDock';

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'pin-van',
    countryCode: 'ca',
    cityKey: 'vancouver',
    name: 'Vancouver',
    lat: 49.2827,
    lng: -123.1207,
    description: 'A coastal mountain haven where modern architecture meets majestic wilderness.',
    material: 'brass',
    imageIds: [],
  },
  {
    id: 'pin-tor',
    countryCode: 'ca',
    cityKey: 'toronto',
    name: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    description: 'The central anchor city of the Bedrood Azizi Family. Concrete lines and lakefront brick.',
    material: 'copper',
    imageIds: [],
  },
  {
    id: 'pin-teh',
    countryCode: 'ir',
    cityKey: 'tehran',
    name: 'Tehran',
    lat: 35.6892,
    lng: 51.389,
    description: 'An ancient mountain-framed valley, rich with Persian geometry and modernist architecture.',
    material: 'brass',
    imageIds: [],
  },
];

export default function App() {
  const appSettings = useAppSettings();

  return (
    <EnvironmentProvider
      tvInteraction={appSettings.tvInteraction}
      mobileLayout={appSettings.mobileLayout}
      isTvScreensaver={appSettings.isTvScreensaver}
      setTvInteraction={appSettings.setTvInteraction}
      setMobileLayout={appSettings.setMobileLayout}
      setTvScreensaver={appSettings.setTvScreensaver}
    >
      <TravelogueApp appSettings={appSettings} />
    </EnvironmentProvider>
  );
}

function TravelogueApp({
  appSettings,
}: {
  appSettings: ReturnType<typeof useAppSettings>;
}) {
  const { tvInteraction } = useEnvironmentContext();
  const [pinScreenPositions, setPinScreenPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [selectedCity, setSelectedCity] = useState<CityConfig>(CITIES.toronto);
  const [currentTime, setCurrentTime] = useState<number>(12.0);
  const [isTimeOverridden, setIsTimeOverridden] = useState<boolean>(false);
  const [countryCodes, setCountryCodes] = useState<string[]>([]);

  const [solarTimes, setSolarTimes] = useState<SolarTimes>({
    sunrise: 6.0,
    sunset: 20.5,
    solarNoon: 13.0,
    dayLength: 14.5,
  });

  const [panelTab, setPanelTab] = useState<PanelTab | null>(null);

  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(true);

  const [openTripCards, setOpenTripCards] = useState<Record<string, TripCardLayout>>({});
  const [tripCardAnchors, setTripCardAnchors] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const zCounterRef = useRef(40);

  const {
    materialMode,
    isTvScreensaver,
    mapSettings,
    homeCityKey,
    setMaterialMode,
    setHomeCityKey,
    setMapSettings,
  } = appSettings;

  const travelogue = useTravelogueStore({
    trips: INITIAL_TRIPS,
  });

  const {
    ready: travelogueReady,
    trips,
    addTrip,
    updateTrip,
    removeTrip,
    importTrips,
    visitedCountryCodes,
  } = travelogue;

  const homeOrigin = useMemo(() => getHomeOrigin(homeCityKey), [homeCityKey]);
  const flights = useMemo(
    () => deriveJournalFlights(homeCityKey, trips),
    [homeCityKey, trips],
  );

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTvScreensaverRef = useRef(isTvScreensaver);
  isTvScreensaverRef.current = isTvScreensaver;

  const scheduleOverlayHide = useCallback(() => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = null;

    if (isTvScreensaverRef.current) {
      idleTimeoutRef.current = setTimeout(() => setIsOverlayVisible(false), 8000);
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    setIsOverlayVisible(true);
    scheduleOverlayHide();
  }, [scheduleOverlayHide]);

  useEffect(() => {
    if (!isTvScreensaver) {
      setIsOverlayVisible(true);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      return;
    }

    const wakeEvents = ['mousedown', 'keydown', 'wheel', 'touchstart'] as const;

    const handleWake = () => resetIdleTimer();
    const handleKey = (e: KeyboardEvent) => {
      if (tvInteraction) return;
      if (e.key === 'Escape') {
        setPanelTab(null);
        setOpenTripCards({});
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
  }, [isTvScreensaver, resetIdleTimer, scheduleOverlayHide, tvInteraction]);

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

    root.style.setProperty('--panel-bg', uiTheme.panelBg);
    root.style.setProperty('--panel-border', uiTheme.panelBorder);
    root.style.setProperty('--panel-text', uiTheme.panelText);
    root.style.setProperty('--panel-muted', uiTheme.panelMuted);
    root.style.setProperty('--panel-surface', uiTheme.panelSurface);
    root.style.setProperty('--dock-bg', uiTheme.dockBg);
    root.style.setProperty('--dock-border', uiTheme.dockBorder);
    root.style.setProperty('--flight-stroke', uiTheme.flightStroke);
    root.style.setProperty('--flight-stroke-width', uiTheme.flightStrokeWidth);
    root.style.setProperty('--flight-plane-fill', uiTheme.flightPlaneFill);
    root.style.setProperty('--flight-plane-stroke', uiTheme.flightPlaneStroke);
    root.style.setProperty('--landmass-stroke', uiTheme.landmassStroke);
    root.style.setProperty('--landmass-stroke-width', uiTheme.landmassStrokeWidth);

    root.classList.toggle('solar-manual-mode', isTimeOverridden);
    root.classList.toggle('solar-clock-mode', !isTimeOverridden);
    root.classList.toggle('solar-dark-phase', isDarkPhase);
  }, [solarState, uiTheme, isTimeOverridden, isDarkPhase]);

  const handleCountriesLoaded = useCallback((codes: string[]) => {
    setCountryCodes(codes);
  }, []);

  const handleTripCardAnchorsChange = useCallback(
    (anchors: Record<string, { x: number; y: number }>) => {
      setTripCardAnchors((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(anchors);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every(
            (id) =>
              prev[id] &&
              Math.abs(prev[id].x - anchors[id].x) <= 0.5 &&
              Math.abs(prev[id].y - anchors[id].y) <= 0.5,
          )
        ) {
          return prev;
        }
        return anchors;
      });
    },
    [],
  );

  const openTripPanel = (trip: Trip) => {
    setOpenTripCards((prev) => {
      const nextZ = ++zCounterRef.current;
      if (prev[trip.id]) {
        return { ...prev, [trip.id]: { ...prev[trip.id], z: nextZ } };
      }
      const cascade = Object.keys(prev).length;
      return {
        ...prev,
        [trip.id]: { z: nextZ, offsetX: cascade * 12, offsetY: cascade * 12 },
      };
    });
    resetIdleTimer();
  };

  const closeTripPanel = (tripId: string) => {
    setOpenTripCards((prev) => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
    resetIdleTimer();
  };

  const focusTripPanel = (tripId: string) => {
    setOpenTripCards((prev) => {
      if (!prev[tripId]) return prev;
      return { ...prev, [tripId]: { ...prev[tripId], z: ++zCounterRef.current } };
    });
  };

  const moveTripPanelOffset = (tripId: string, offsetX: number, offsetY: number) => {
    setOpenTripCards((prev) => {
      if (!prev[tripId]) return prev;
      return { ...prev, [tripId]: { ...prev[tripId], offsetX, offsetY } };
    });
  };

  const handleTripLocationChange = (tripId: string, lat: number, lng: number) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;
    updateTrip({
      ...trip,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      cityKey: undefined,
    });
    resetIdleTimer();
  };

  const openPanel = (tab: PanelTab = 'settings') => {
    setPanelTab((current) => (current === tab ? null : tab));
    resetIdleTimer();
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

  const openTripIds = Object.keys(openTripCards);

  const topTripCardId = useMemo(() => {
    const entries = Object.entries(openTripCards);
    if (!entries.length) return null;
    return entries.reduce((best, [id, layout]) =>
      layout.z > (openTripCards[best]?.z ?? 0) ? id : best,
    entries[0][0]);
  }, [openTripCards]);

  const closeAllTripPanels = useCallback(() => {
    setOpenTripCards({});
    resetIdleTimer();
  }, [resetIdleTimer]);

  const appContent = (
    <div className="relative h-full w-full overflow-hidden">
      {!travelogueReady && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#f5f0e8]/80 backdrop-blur-sm">
          <p className="text-xs font-light uppercase tracking-[0.3em] opacity-50">Loading chronicle…</p>
        </div>
      )}
      <WorldMap
        solarState={solarState}
        openTripIds={openTripIds}
        trips={trips}
        flights={flights}
        homeOrigin={homeOrigin}
        visitedCountryCodes={visitedCountryCodes()}
        showFlightPaths={mapSettings.showFlightPaths}
        highlightVisited={mapSettings.highlightVisited}
        onPinClick={openTripPanel}
        onTripLocationChange={handleTripLocationChange}
        onTripCardAnchorsChange={handleTripCardAnchorsChange}
        onPinScreenPositionsChange={tvInteraction ? setPinScreenPositions : undefined}
        onCountriesLoaded={handleCountriesLoaded}
        materialMode={materialMode}
        isOverlayVisible={isOverlayVisible}
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

      <ControlDock
        isOverlayVisible={isOverlayVisible}
        panelOpen={panelTab !== null}
        onOpenSettings={() => openPanel(panelTab ?? 'settings')}
      />

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
        trips={trips}
        flights={flights}
        countryCodes={countryCodes}
        onTripSelect={openTripPanel}
        onAddTrip={(trip, imageChanges) => void addTrip(trip, imageChanges)}
        onUpdateTrip={(trip, imageChanges) => void updateTrip(trip, imageChanges)}
        onRemoveTrip={removeTrip}
        onImportTrips={(imported) => {
          void importTrips(imported);
          setOpenTripCards({});
          resetIdleTimer();
        }}
        homeOrigin={homeOrigin}
        homeCityKey={homeCityKey}
        onHomeCityChange={(cityKey) => {
          setHomeCityKey(cityKey);
          resetIdleTimer();
        }}
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
          }
          resetIdleTimer();
        }}
        materialMode={materialMode}
        onMaterialChange={(mode) => {
          setMaterialMode(mode);
          resetIdleTimer();
        }}
        showFlightPaths={mapSettings.showFlightPaths}
        onToggleFlightPaths={() =>
          setMapSettings((s) => ({ ...s, showFlightPaths: !s.showFlightPaths }))
        }
        highlightVisited={mapSettings.highlightVisited}
        onToggleHighlightVisited={() =>
          setMapSettings((s) => ({ ...s, highlightVisited: !s.highlightVisited }))
        }
      />

      {!panelTab &&
        openTripIds.map((tripId) => {
          const trip = trips.find((t) => t.id === tripId);
          const layout = openTripCards[tripId];
          const anchor = tripCardAnchors[tripId];
          if (!trip || !layout || !anchor) return null;

          const position = pinAnchoredCardPosition(
            anchor.x,
            anchor.y,
            layout.offsetX,
            layout.offsetY,
          );

          return (
            <TripDetailCard
              key={tripId}
              trip={trip}
              layout={layout}
              position={position}
              isDarkPhase={isDarkPhase}
              isOverlayVisible={isOverlayVisible}
              isPrimaryOpenCard={tripId === topTripCardId}
              onClose={() => closeTripPanel(tripId)}
              onFocus={() => focusTripPanel(tripId)}
              onMoveOffset={(offsetX, offsetY) => moveTripPanelOffset(tripId, offsetX, offsetY)}
              onOpenChronicle={() => {
                setPanelTab('sketchbook');
                resetIdleTimer();
              }}
            />
          );
        })}
      <EnvironmentDebugBar />
    </div>
  );

  return (
    <TvFocusProvider
      enabled={tvInteraction}
      trips={trips}
      pinPositions={pinScreenPositions}
      panelTab={panelTab}
      openTripIds={openTripIds}
      topTripCardId={topTripCardId}
      chronicleCount={trips.length}
      isOverlayVisible={isOverlayVisible}
      onOpenPanel={openPanel}
      onClosePanel={() => setPanelTab(null)}
      onPanelTabChange={setPanelTab}
      onOpenTrip={openTripPanel}
      onCloseTrip={closeTripPanel}
      onCloseAllTrips={closeAllTripPanels}
      onOpenChronicleFromCard={() => {
        setPanelTab('sketchbook');
        resetIdleTimer();
      }}
      onResetIdle={resetIdleTimer}
    >
      {appContent}
    </TvFocusProvider>
  );
}
