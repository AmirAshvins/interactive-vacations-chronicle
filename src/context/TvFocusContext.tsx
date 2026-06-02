import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Trip } from '../types/travelogue';
import type { PanelTab } from '../components/RightPanel';
import { findNearestInDirection, pickInitialPinId, type SpatialDirection } from '../utils/spatialNav';

export type TvZone =
  | 'dock'
  | 'map'
  | 'panel-header'
  | 'chronicle'
  | 'chronicle-archive'
  | 'trip-card';

export type TripCardFocusTarget = 'chronicle' | 'close';

export type ChronicleArchiveTarget = 'export' | 'import';

export interface TvFocusState {
  zone: TvZone;
  mapPinId: string | null;
  chronicleIndex: number;
  panelTabIndex: number;
  tripCardTarget: TripCardFocusTarget;
  archiveTarget: ChronicleArchiveTarget;
}

export interface TvArchiveActions {
  onExport: () => void;
  onOpenImport: () => void;
}

export interface TvImportDialogState {
  isOpen: boolean;
  onClose: () => void;
}

interface TvFocusActions {
  panelTab: PanelTab | null;
  openTripIds: string[];
  topTripCardId: string | null;
  chronicleCount: number;
  isOverlayVisible: boolean;
  onOpenPanel: (tab?: PanelTab) => void;
  onClosePanel: () => void;
  onPanelTabChange: (tab: PanelTab) => void;
  onOpenTrip: (trip: Trip) => void;
  onCloseTrip: (tripId: string) => void;
  onCloseAllTrips: () => void;
  onOpenChronicleFromCard: () => void;
  onResetIdle: () => void;
}

interface TvFocusProviderProps extends TvFocusActions {
  children: ReactNode;
  enabled: boolean;
  trips: Trip[];
  pinPositions: Record<string, { x: number; y: number }>;
}

interface TvFocusContextValue {
  enabled: boolean;
  state: TvFocusState;
  isMapPinFocused: (id: string) => boolean;
  isChronicleFocused: (index: number) => boolean;
  isPanelTabFocused: (index: number) => boolean;
  isArchiveExportFocused: boolean;
  isArchiveImportFocused: boolean;
  isDockFocused: boolean;
  isTripCardFocused: boolean;
  tripCardTarget: TripCardFocusTarget;
  registerChronicleScroller: (fn: (index: number) => void) => void;
  registerArchiveActions: (actions: TvArchiveActions | null) => void;
  registerImportDialog: (state: TvImportDialogState | null) => void;
}

const TvFocusContext = createContext<TvFocusContextValue | null>(null);

const INITIAL_STATE: TvFocusState = {
  zone: 'map',
  mapPinId: null,
  chronicleIndex: 0,
  panelTabIndex: 0,
  tripCardTarget: 'chronicle',
  archiveTarget: 'export',
};

function isBackKey(key: string): boolean {
  return key === 'Escape' || key === 'Backspace';
}

function isActivateKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

function arrowDirection(key: string): SpatialDirection | null {
  if (key === 'ArrowUp') return 'up';
  if (key === 'ArrowDown') return 'down';
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowRight') return 'right';
  return null;
}

export function TvFocusProvider({
  children,
  enabled,
  trips,
  pinPositions,
  panelTab,
  openTripIds,
  topTripCardId,
  chronicleCount,
  isOverlayVisible,
  onOpenPanel,
  onClosePanel,
  onPanelTabChange,
  onOpenTrip,
  onCloseTrip,
  onCloseAllTrips,
  onOpenChronicleFromCard,
  onResetIdle,
}: TvFocusProviderProps) {
  const [state, setState] = useState<TvFocusState>(INITIAL_STATE);
  const chronicleScrollRef = useRef<((index: number) => void) | null>(null);
  const archiveActionsRef = useRef<TvArchiveActions | null>(null);
  const importDialogRef = useRef<TvImportDialogState | null>(null);

  const registerChronicleScroller = useCallback((fn: (index: number) => void) => {
    chronicleScrollRef.current = fn;
  }, []);

  const registerArchiveActions = useCallback((actions: TvArchiveActions | null) => {
    archiveActionsRef.current = actions;
  }, []);

  const registerImportDialog = useCallback((dialog: TvImportDialogState | null) => {
    importDialogRef.current = dialog;
  }, []);

  const isImportDialogOpen = () => importDialogRef.current?.isOpen ?? false;

  const ensureMapPin = useCallback(
    (pinId: string | null): string | null => {
      if (pinId && trips.some((t) => t.id === pinId)) return pinId;
      return pickInitialPinId(trips, pinPositions);
    },
    [trips, pinPositions],
  );

  useEffect(() => {
    if (!enabled) return;
    setState((prev) => ({
      ...prev,
      mapPinId: ensureMapPin(prev.mapPinId),
    }));
  }, [enabled, ensureMapPin, trips.length]);

  useEffect(() => {
    if (!enabled || state.zone !== 'chronicle') return;
    chronicleScrollRef.current?.(state.chronicleIndex);
  }, [enabled, state.zone, state.chronicleIndex]);

  const goBack = useCallback(() => {
    if (isImportDialogOpen()) {
      importDialogRef.current?.onClose();
      onResetIdle();
      return;
    }

    setState((prev) => {
      if (prev.zone === 'trip-card') {
        if (topTripCardId) onCloseTrip(topTripCardId);
        return { ...prev, zone: 'map' };
      }
      if (prev.zone === 'chronicle' || prev.zone === 'chronicle-archive' || prev.zone === 'panel-header') {
        onClosePanel();
        return { ...prev, zone: 'map', panelTabIndex: 0 };
      }
      if (prev.zone === 'dock') {
        return { ...prev, zone: 'map' };
      }
      if (openTripIds.length > 0) {
        onCloseAllTrips();
      }
      if (panelTab) {
        onClosePanel();
      }
      return prev;
    });
    onResetIdle();
  }, [topTripCardId, onCloseTrip, onClosePanel, onCloseAllTrips, openTripIds.length, panelTab, onResetIdle]);

  const handleArrow = useCallback(
    (direction: SpatialDirection) => {
      if (isImportDialogOpen()) return;

      setState((prev) => {
        onResetIdle();

        if (prev.zone === 'dock') {
          if (direction === 'up' || direction === 'left') {
            return { ...prev, zone: 'map', mapPinId: ensureMapPin(prev.mapPinId) };
          }
          if (direction === 'right' && panelTab) {
            return { ...prev, zone: panelTab === 'sketchbook' ? 'chronicle' : 'panel-header' };
          }
          if (direction === 'right') {
            onOpenPanel('sketchbook');
            return { ...prev, zone: 'chronicle', chronicleIndex: 0, panelTabIndex: 0 };
          }
          return { ...prev, zone: 'map', mapPinId: ensureMapPin(prev.mapPinId) };
        }

        if (prev.zone === 'map') {
          const currentId = ensureMapPin(prev.mapPinId);
          if (!currentId) return prev;

          const points = trips
            .map((t) => {
              const p = pinPositions[t.id];
              return p ? { id: t.id, x: p.x, y: p.y } : null;
            })
            .filter((p): p is { id: string; x: number; y: number } => p !== null);

          const current = points.find((p) => p.id === currentId) ?? {
            id: currentId,
            x: pinPositions[currentId]?.x ?? 0,
            y: pinPositions[currentId]?.y ?? 0,
          };

          if (direction === 'right') {
            if (panelTab) {
              return {
                ...prev,
                zone: panelTab === 'sketchbook' ? 'chronicle' : 'panel-header',
                mapPinId: currentId,
              };
            }
            onOpenPanel('sketchbook');
            return {
              ...prev,
              zone: 'chronicle',
              chronicleIndex: Math.max(0, trips.findIndex((t) => t.id === currentId)),
              panelTabIndex: 0,
              mapPinId: currentId,
            };
          }

          if (direction === 'left') {
            return { ...prev, zone: 'dock', mapPinId: currentId };
          }

          const nextId = findNearestInDirection(current, points, direction);
          if (nextId) {
            return { ...prev, mapPinId: nextId };
          }
          return prev;
        }

        if (prev.zone === 'panel-header') {
          if (direction === 'left') {
            onClosePanel();
            return { ...prev, zone: 'map' };
          }
          if (direction === 'right') {
            const nextTab: PanelTab = prev.panelTabIndex === 0 ? 'settings' : 'sketchbook';
            onPanelTabChange(nextTab);
            return {
              ...prev,
              panelTabIndex: nextTab === 'sketchbook' ? 0 : 1,
              zone: nextTab === 'sketchbook' ? 'chronicle' : 'panel-header',
            };
          }
          if (direction === 'down' && panelTab === 'sketchbook') {
            return { ...prev, zone: 'chronicle' };
          }
          return prev;
        }

        if (prev.zone === 'chronicle') {
          if (direction === 'left') {
            onClosePanel();
            return { ...prev, zone: 'map' };
          }
          if (direction === 'down') {
            const atLastRow =
              chronicleCount === 0 || prev.chronicleIndex >= chronicleCount - 1;
            if (atLastRow) {
              return { ...prev, zone: 'chronicle-archive', archiveTarget: 'export' };
            }
          }
          let nextIndex = prev.chronicleIndex;
          if (direction === 'up') {
            nextIndex = Math.max(0, prev.chronicleIndex - 1);
          } else if (direction === 'down') {
            nextIndex = Math.min(chronicleCount - 1, prev.chronicleIndex + 1);
          } else if (direction === 'right') {
            onPanelTabChange('settings');
            return { ...prev, zone: 'panel-header', panelTabIndex: 1 };
          }
          if (nextIndex !== prev.chronicleIndex) {
            return { ...prev, chronicleIndex: nextIndex };
          }
          return prev;
        }

        if (prev.zone === 'chronicle-archive') {
          if (direction === 'left') {
            onClosePanel();
            return { ...prev, zone: 'map' };
          }
          if (direction === 'up') {
            if (prev.archiveTarget === 'import') {
              return { ...prev, archiveTarget: 'export' };
            }
            return {
              ...prev,
              zone: 'chronicle',
              chronicleIndex: Math.max(0, chronicleCount - 1),
            };
          }
          if (direction === 'down') {
            if (prev.archiveTarget === 'export') {
              return { ...prev, archiveTarget: 'import' };
            }
            return prev;
          }
          if (direction === 'right') {
            onPanelTabChange('settings');
            return { ...prev, zone: 'panel-header', panelTabIndex: 1 };
          }
          return prev;
        }

        if (prev.zone === 'trip-card') {
          if (direction === 'left' || direction === 'down') {
            if (topTripCardId) onCloseTrip(topTripCardId);
            return { ...prev, zone: 'map' };
          }
          if (direction === 'up' || direction === 'right') {
            return {
              ...prev,
              tripCardTarget: prev.tripCardTarget === 'chronicle' ? 'close' : 'chronicle',
            };
          }
          return prev;
        }

        return prev;
      });
    },
    [
      trips,
      pinPositions,
      panelTab,
      chronicleCount,
      ensureMapPin,
      onOpenPanel,
      onClosePanel,
      onPanelTabChange,
      onCloseTrip,
      onResetIdle,
    ],
  );

  const handleActivate = useCallback(() => {
    if (isImportDialogOpen()) return;

    onResetIdle();

    if (state.zone === 'dock') {
      onOpenPanel(panelTab ?? 'settings');
      setState((s) => ({
        ...s,
        zone: panelTab === 'sketchbook' ? 'chronicle' : 'panel-header',
        panelTabIndex: panelTab === 'settings' ? 1 : 0,
      }));
      return;
    }

    if (state.zone === 'map') {
      const pinId = ensureMapPin(state.mapPinId);
      const trip = trips.find((t) => t.id === pinId);
      if (trip) {
        onOpenTrip(trip);
        setState((s) => ({
          ...s,
          zone: 'trip-card',
          mapPinId: pinId,
          tripCardTarget: 'chronicle',
        }));
      }
      return;
    }

    if (state.zone === 'panel-header') {
      const tab: PanelTab = state.panelTabIndex === 0 ? 'sketchbook' : 'settings';
      onPanelTabChange(tab);
      setState((s) => ({
        ...s,
        zone: tab === 'sketchbook' ? 'chronicle' : 'panel-header',
      }));
      return;
    }

    if (state.zone === 'chronicle') {
      const trip = trips[state.chronicleIndex];
      if (trip) {
        onClosePanel();
        onOpenTrip(trip);
        setState((s) => ({
          ...s,
          zone: 'trip-card',
          mapPinId: trip.id,
          tripCardTarget: 'chronicle',
        }));
      }
      return;
    }

    if (state.zone === 'chronicle-archive') {
      if (state.archiveTarget === 'export') {
        archiveActionsRef.current?.onExport();
      } else {
        archiveActionsRef.current?.onOpenImport();
      }
      return;
    }

    if (state.zone === 'trip-card') {
      if (state.tripCardTarget === 'close' && topTripCardId) {
        onCloseTrip(topTripCardId);
        setState((s) => ({ ...s, zone: 'map' }));
      } else {
        onOpenChronicleFromCard();
        setState((s) => ({
          ...s,
          zone: 'chronicle',
          panelTabIndex: 0,
          chronicleIndex: Math.max(0, trips.findIndex((t) => t.id === topTripCardId)),
        }));
      }
    }
  }, [
    state,
    trips,
    panelTab,
    topTripCardId,
    ensureMapPin,
    onOpenPanel,
    onPanelTabChange,
    onOpenTrip,
    onCloseTrip,
    onOpenChronicleFromCard,
    onResetIdle,
  ]);

  useEffect(() => {
    if (!enabled || !isOverlayVisible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return;

      const direction = arrowDirection(e.key);
      if (direction) {
        e.preventDefault();
        handleArrow(direction);
        return;
      }

      if (isBackKey(e.key)) {
        e.preventDefault();
        goBack();
        return;
      }

      if (isActivateKey(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        handleActivate();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, isOverlayVisible, handleArrow, goBack, handleActivate]);

  useEffect(() => {
    if (!enabled || !panelTab) return;
    setState((s) => ({
      ...s,
      panelTabIndex: panelTab === 'sketchbook' ? 0 : 1,
    }));
  }, [enabled, panelTab]);

  const value = useMemo<TvFocusContextValue>(
    () => ({
      enabled,
      state,
      isMapPinFocused: (id) => enabled && state.zone === 'map' && state.mapPinId === id,
      isChronicleFocused: (index) => enabled && state.zone === 'chronicle' && state.chronicleIndex === index,
      isPanelTabFocused: (index) => enabled && state.zone === 'panel-header' && state.panelTabIndex === index,
      isArchiveExportFocused:
        enabled && state.zone === 'chronicle-archive' && state.archiveTarget === 'export',
      isArchiveImportFocused:
        enabled && state.zone === 'chronicle-archive' && state.archiveTarget === 'import',
      isDockFocused: enabled && state.zone === 'dock',
      isTripCardFocused: enabled && state.zone === 'trip-card',
      tripCardTarget: state.tripCardTarget,
      registerChronicleScroller,
      registerArchiveActions,
      registerImportDialog,
    }),
    [enabled, state, registerChronicleScroller, registerArchiveActions, registerImportDialog],
  );

  return <TvFocusContext.Provider value={value}>{children}</TvFocusContext.Provider>;
}

export function useTvFocus(): TvFocusContextValue {
  const ctx = useContext(TvFocusContext);
  if (!ctx) {
    return {
      enabled: false,
      state: INITIAL_STATE,
      isMapPinFocused: () => false,
      isChronicleFocused: () => false,
      isPanelTabFocused: () => false,
      isArchiveExportFocused: false,
      isArchiveImportFocused: false,
      isDockFocused: false,
      isTripCardFocused: false,
      tripCardTarget: 'chronicle',
      registerChronicleScroller: () => {},
      registerArchiveActions: () => {},
      registerImportDialog: () => {},
    };
  }
  return ctx;
}
