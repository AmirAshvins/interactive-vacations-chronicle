import { Sliders } from 'lucide-react';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { useTvFocus } from '../context/TvFocusContext';

interface ControlDockProps {
  isOverlayVisible: boolean;
  panelOpen: boolean;
  onOpenSettings: () => void;
}

export default function ControlDock({
  isOverlayVisible,
  panelOpen,
  onOpenSettings,
}: ControlDockProps) {
  const tv = useTvFocus();
  const { mobileLayout } = useEnvironmentContext();
  const hideForSheet = mobileLayout && panelOpen;

  return (
    <div
      className={`control-dock tv-hud-element ${isOverlayVisible ? '' : 'tv-hud-hidden'} ${
        hideForSheet ? 'control-dock--sheet-open' : ''
      }`}
    >
      <button
        type="button"
        onClick={onOpenSettings}
        className={`dock-btn dock-btn-settings dock-btn-icon-only ${panelOpen ? 'active' : ''} ${tv.isDockFocused ? 'tv-focused' : ''}`}
        title="Open panel"
        aria-label="Open panel"
        aria-hidden={hideForSheet}
        tabIndex={hideForSheet ? -1 : 0}
      >
        <Sliders size={16} />
      </button>
    </div>
  );
}
