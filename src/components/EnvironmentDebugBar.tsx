import { useEnvironmentContext } from '../context/EnvironmentContext';
import { useTvFocus } from '../context/TvFocusContext';

const ZONE_LABELS: Record<string, string> = {
  dock: 'Dock',
  map: 'Map pins',
  'panel-header': 'Panel tabs',
  chronicle: 'Chronicle list',
  'trip-card': 'Journey card',
};

/** Visible while TV interaction is on — helps debug remote/focus behavior on desktop */
export default function EnvironmentDebugBar() {
  const env = useEnvironmentContext();
  const tv = useTvFocus();

  if (!env.tvInteraction) return null;

  const zoneLabel = ZONE_LABELS[tv.state.zone] ?? tv.state.zone;

  return (
    <div
      className="env-debug-bar pointer-events-none fixed bottom-3 left-1/2 z-[90] flex max-w-[min(96vw,640px)] -translate-x-1/2 flex-col items-center gap-1"
      aria-live="polite"
    >
      <div className="rounded-full border border-[#a58452]/30 bg-black/80 px-4 py-2 text-center text-[9px] font-mono uppercase tracking-widest text-[#e8d4b0] shadow-lg backdrop-blur-md">
        <span className="text-[#a58452]">TV Remote</span>
        {' · '}
        {zoneLabel}
        {tv.state.zone === 'map' && tv.state.mapPinId ? ` · ${tv.state.mapPinId}` : ''}
        {env.mobileLayout ? ' · Mobile layout' : ''}
      </div>
      <p className="text-[8px] font-mono uppercase tracking-widest text-[#e8d4b0]/70">
        ↑↓←→ move · Enter select · Esc back
      </p>
    </div>
  );
}
