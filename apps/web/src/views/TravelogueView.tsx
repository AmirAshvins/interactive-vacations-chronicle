import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CITIES,
  getSolarState,
  fetchSolarTimes,
  calculateSolarTimesMath,
  getDecimalHoursInTimezone,
} from '../utils/solarEngine';
import type { CityConfig, SolarTimes } from '../utils/solarEngine';
import type { Trip } from '../types/travelogue';
import WorldMap from '../components/WorldMap';
import RightPanel, { type PanelTab } from '../components/RightPanel';
import TripDetailCard, { type TripCardLayout } from '../components/TripDetailCard';
import { pinAnchoredCardPosition } from '../utils/tripCardPosition';
import { deriveJournalFlights, getHomeOrigin } from '../utils/flightRoutes';
import { useTravelogueStore } from '../hooks/useTravelogueStore';
import { useSyncedTravelogueStore } from '../hooks/useSyncedTravelogueStore';
import { useAppSettings } from '../hooks/useAppSettings';
import { useAuth } from '../context/AuthContext';
import { gqlRequest } from '../lib/graphql/client';
import { UPDATE_TRAVELOGUE } from '../lib/graphql/operations';
import { getSolarUiTheme, SOLAR_CLOCK_TRANSITION_MS, SOLAR_MANUAL_TRANSITION_MS } from '../utils/solarTheme';
import { flightThemeForPinStyle } from '../data/mapPinStyles';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { TvFocusProvider, useTvFocus } from '../context/TvFocusContext';
import { PanelChromeProvider, usePanelChrome } from '../context/PanelChromeContext';
import EnvironmentDebugBar from '../components/EnvironmentDebugBar';
import ControlDock from '../components/ControlDock';
import { ArrowLeft } from 'lucide-react';

const INITIAL_TRIPS: Trip[] = [];

export type TravelogueViewMode = 'local' | 'synced';

export interface TravelogueViewProps {
  mode: TravelogueViewMode;
  travelogueId?: string;
  appSettings: ReturnType<typeof useAppSettings>;
}

export default function TravelogueView({ mode, travelogueId, appSettings }: TravelogueViewProps) {
  const { tvInteraction, mobileLayout } = useEnvironmentContext();
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

  useEffect(() => {
    document.documentElement.classList.toggle(
      'map-panel-open',
      mobileLayout && panelTab !== null && isOverlayVisible,
    );
    return () => document.documentElement.classList.remove('map-panel-open');
  }, [mobileLayout, panelTab, isOverlayVisible]);

  const [openTripCards, setOpenTripCards] = useState<Record<string, TripCardLayout>>({});
  const [tripCardAnchors, setTripCardAnchors] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const zCounterRef = useRef(45);

  const {
    materialMode,
    isTvScreensaver,
    mapSettings,
    homeCityKey,
    mapPinStyle,
    setMaterialMode,
    setHomeCityKey,
    setMapSettings,
    setMapPinStyle,
  } = appSettings;

  const { accessToken, setLastTravelogueId } = useAuth();

  const localTravelogue = useTravelogueStore({
    trips: INITIAL_TRIPS,
  });

  const syncedTravelogue = useSyncedTravelogueStore(
    travelogueId ?? '',
    mode === 'synced' ? accessToken : null,
  );

  const travelogue = mode === 'synced' ? syncedTravelogue : localTravelogue;

  const {
    ready: travelogueReady,
    trips,
    addTrip,
    updateTrip,
    removeTrip,
    importTrips,
    mergeImportTrips,
    visitedCountryCodes,
  } = travelogue;

  const syncError = mode === 'synced' ? syncedTravelogue.error : null;
  const syncMeta = mode === 'synced' ? syncedTravelogue.meta : null;
  const syncOnline = mode === 'synced' ? syncedTravelogue.isOnline : true;
  const syncPending = mode === 'synced' ? syncedTravelogue.pendingSync : 0;
  const syncNotice = mode === 'synced' ? syncedTravelogue.syncNotice : null;
  const dismissSyncNotice =
    mode === 'synced' ? syncedTravelogue.dismissSyncNotice : () => {};

  useEffect(() => {
    if (mode !== 'synced' || !syncMeta) return;
    setHomeCityKey(syncMeta.homeCityKey);
    setMapSettings(syncMeta.mapSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply server settings once per travelogue load
  }, [mode, syncMeta?.id]);

  useEffect(() => {
    if (mode === 'synced' && travelogueId) {
      setLastTravelogueId(travelogueId);
    }
  }, [mode, travelogueId, setLastTravelogueId]);

  const persistTravelogueSettings = useCallback(
    async (patch: {
      homeCityKey?: string;
      mapSettings?: { showFlightPaths?: boolean; highlightVisited?: boolean };
    }) => {
      if (mode !== 'synced' || !accessToken || !travelogueId) return;
      await gqlRequest(
        UPDATE_TRAVELOGUE,
        {
          id: travelogueId,
          homeCityKey: patch.homeCityKey,
          mapSettings: patch.mapSettings,
        },
        accessToken,
      );
    },
    [mode, accessToken, travelogueId],
  );

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
  const pinFlightTheme = flightThemeForPinStyle(mapPinStyle, isDarkPhase);

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
    root.style.setProperty('--flight-stroke', pinFlightTheme.flightStroke);
    root.style.setProperty('--flight-stroke-width', uiTheme.flightStrokeWidth);
    root.style.setProperty('--flight-plane-fill', pinFlightTheme.flightPlaneFill);
    root.style.setProperty('--flight-plane-stroke', pinFlightTheme.flightPlaneStroke);
    root.style.setProperty('--landmass-stroke', uiTheme.landmassStroke);
    root.style.setProperty('--landmass-stroke-width', uiTheme.landmassStrokeWidth);

    root.classList.toggle('solar-manual-mode', isTimeOverridden);
    root.classList.toggle('solar-clock-mode', !isTimeOverridden);
    root.classList.toggle('solar-dark-phase', isDarkPhase);
  }, [solarState, uiTheme, pinFlightTheme, isTimeOverridden, isDarkPhase, mapPinStyle]);

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

  const chronicleNavRef = useRef<(tripId: string) => void>(() => {});
  const bindChronicleNav = useCallback((fn: (tripId: string) => void) => {
    chronicleNavRef.current = fn;
  }, []);

  const appContent = (
    <div className="relative h-full w-full overflow-hidden">
      {mode === 'synced' ? (
        <div
          className={`absolute right-4 top-4 z-[85] rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm ${
            !syncOnline
              ? 'border-amber-600/30 bg-amber-50/90 text-amber-900'
              : syncPending > 0
                ? 'border-sky-600/30 bg-sky-50/90 text-sky-900'
                : 'border-emerald-600/30 bg-emerald-50/90 text-emerald-800'
          }`}
          title={
            !syncOnline
              ? 'Offline — edits save locally and sync when back online'
              : syncPending > 0
                ? `${syncPending} change(s) waiting to sync`
                : 'Changes from other devices appear automatically'
          }
        >
          {!syncOnline ? 'Offline' : syncPending > 0 ? `Sync (${syncPending})` : 'Live'}
        </div>
      ) : null}
      {!travelogueReady && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#f5f0e8]/80 backdrop-blur-sm">
          <p className="text-xs font-light uppercase tracking-[0.3em] opacity-50">Loading chronicle…</p>
        </div>
      )}
      {syncError ? (
        <div className="absolute left-4 right-4 top-4 z-[90] rounded-lg border border-red-200 bg-red-50/95 px-4 py-2 text-sm text-red-800">
          {syncError}
        </div>
      ) : null}
      {syncNotice ? (
        <div className="absolute left-4 right-4 top-14 z-[90] flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-2 text-sm text-amber-900">
          <span>{syncNotice}</span>
          <button
            type="button"
            className="shrink-0 text-xs font-medium uppercase tracking-wide opacity-70 hover:opacity-100"
            onClick={dismissSyncNotice}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {mode === 'synced' ? (
        <Link
          to="/travelogues"
          className="absolute left-4 top-4 z-[85] flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)]/90 px-3 py-2 text-xs font-medium text-[var(--panel-text)] backdrop-blur-sm"
        >
          <ArrowLeft size={14} />
          Travelogues
        </Link>
      ) : (
        <Link
          to="/login"
          className="absolute left-4 top-4 z-[85] rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)]/90 px-3 py-2 text-xs text-[var(--panel-muted)] backdrop-blur-sm"
        >
          Sign in to sync
        </Link>
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
        mapPinStyle={mapPinStyle}
        isOverlayVisible={isOverlayVisible}
        onMapClick={resetIdleTimer}
        openTripCount={openTripIds.length}
        onCloseAllTrips={closeAllTripPanels}
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
        onImportTrips={(result) => {
          if (result.resolution === 'merge') {
            void mergeImportTrips(result.trips);
          } else {
            void importTrips(result.trips);
          }
          setOpenTripCards({});
          resetIdleTimer();
        }}
        homeOrigin={homeOrigin}
        homeCityKey={homeCityKey}
        onHomeCityChange={(cityKey) => {
          setHomeCityKey(cityKey);
          void persistTravelogueSettings({ homeCityKey: cityKey });
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
        onToggleFlightPaths={() => {
          const next = !mapSettings.showFlightPaths;
          setMapSettings((s) => ({ ...s, showFlightPaths: next }));
          void persistTravelogueSettings({ mapSettings: { showFlightPaths: next } });
        }}
        highlightVisited={mapSettings.highlightVisited}
        onToggleHighlightVisited={() => {
          const next = !mapSettings.highlightVisited;
          setMapSettings((s) => ({ ...s, highlightVisited: next }));
          void persistTravelogueSettings({ mapSettings: { highlightVisited: next } });
        }}
        mapPinStyle={mapPinStyle}
        onMapPinStyleChange={(style) => {
          setMapPinStyle(style);
          resetIdleTimer();
        }}
      />

      {(!panelTab || !mobileLayout) && (
        <OpenTripCardLayer
          openTripIds={openTripIds}
          trips={trips}
          openTripCards={openTripCards}
          tripCardAnchors={tripCardAnchors}
          mobileLayout={mobileLayout}
          panelTab={panelTab}
          topTripCardId={topTripCardId}
          isDarkPhase={isDarkPhase}
          isOverlayVisible={isOverlayVisible}
          onCloseTrip={closeTripPanel}
          onFocusTrip={focusTripPanel}
          onMoveOffset={moveTripPanelOffset}
          onOpenPanelTab={() => setPanelTab('sketchbook')}
          resetIdleTimer={resetIdleTimer}
        />
      )}
      <EnvironmentDebugBar isOverlayVisible={isOverlayVisible} />
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
        if (topTripCardId) {
          requestAnimationFrame(() => chronicleNavRef.current(topTripCardId));
        }
      }}
      onResetIdle={resetIdleTimer}
    >
      <PanelChromeProvider>
        <ChronicleNavBinder bind={bindChronicleNav} />
        {appContent}
      </PanelChromeProvider>
    </TvFocusProvider>
  );
}

function ChronicleNavBinder({ bind }: { bind: (fn: (tripId: string) => void) => void }) {
  const tv = useTvFocus();
  const { expandPanelSheet } = usePanelChrome();

  useEffect(() => {
    bind((tripId: string) => {
      expandPanelSheet();
      requestAnimationFrame(() => tv.scrollChronicleToTripId(tripId));
    });
    return () => bind(() => {});
  }, [bind, tv, expandPanelSheet]);

  return null;
}

interface OpenTripCardLayerProps {
  openTripIds: string[];
  trips: Trip[];
  openTripCards: Record<string, TripCardLayout>;
  tripCardAnchors: Record<string, { x: number; y: number }>;
  mobileLayout: boolean;
  panelTab: PanelTab | null;
  topTripCardId: string | null;
  isDarkPhase: boolean;
  isOverlayVisible: boolean;
  onCloseTrip: (tripId: string) => void;
  onFocusTrip: (tripId: string) => void;
  onMoveOffset: (tripId: string, offsetX: number, offsetY: number) => void;
  onOpenPanelTab: () => void;
  resetIdleTimer: () => void;
}

function OpenTripCardLayer({
  openTripIds,
  trips,
  openTripCards,
  tripCardAnchors,
  mobileLayout,
  panelTab,
  topTripCardId,
  isDarkPhase,
  isOverlayVisible,
  onCloseTrip,
  onFocusTrip,
  onMoveOffset,
  onOpenPanelTab,
  resetIdleTimer,
}: OpenTripCardLayerProps) {
  const tv = useTvFocus();
  const { expandPanelSheet } = usePanelChrome();

  const openChronicleForTrip = useCallback(
    (tripId: string) => {
      onOpenPanelTab();
      resetIdleTimer();
      expandPanelSheet();
      requestAnimationFrame(() => tv.scrollChronicleToTripId(tripId));
    },
    [onOpenPanelTab, resetIdleTimer, expandPanelSheet, tv],
  );

  return (
    <>
      {openTripIds.map((tripId) => {
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
        const cardZIndex = Math.max(45, !mobileLayout && panelTab ? layout.z + 24 : layout.z);

        return (
          <TripDetailCard
            key={tripId}
            trip={trip}
            layout={layout}
            position={position}
            cardZIndex={cardZIndex}
            isDarkPhase={isDarkPhase}
            isOverlayVisible={isOverlayVisible}
            isPrimaryOpenCard={tripId === topTripCardId}
            onClose={() => onCloseTrip(tripId)}
            onFocus={() => onFocusTrip(tripId)}
            onMoveOffset={(offsetX, offsetY) => onMoveOffset(tripId, offsetX, offsetY)}
            onOpenChronicle={() => openChronicleForTrip(tripId)}
          />
        );
      })}
    </>
  );
}
