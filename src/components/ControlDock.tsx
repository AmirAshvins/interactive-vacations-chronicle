import { Maximize2, Minimize2, Sliders } from 'lucide-react';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { useTvFocus } from '../context/TvFocusContext';
import { useFullscreen } from '../hooks/useFullscreen';

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
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const hideForSheet = mobileLayout && panelOpen;

  const isSettingsFocused =
    tv.enabled && tv.state.zone === 'dock' && tv.state.dockTarget === 'settings';
  const isFullscreenFocused =
    tv.enabled && tv.state.zone === 'dock' && tv.state.dockTarget === 'fullscreen';

  return (
    <div
      className={`control-dock tv-hud-element ${isOverlayVisible ? '' : 'tv-hud-hidden'} ${
        hideForSheet ? 'control-dock--sheet-open' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className={`dock-btn dock-btn-icon-only dock-btn-fullscreen ${isFullscreenFocused ? 'tv-focused' : ''}`}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-hidden={hideForSheet}
        tabIndex={hideForSheet ? -1 : 0}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <span className="dock-divider" aria-hidden />
      <button
        type="button"
        onClick={onOpenSettings}
        className={`dock-btn dock-btn-settings dock-btn-icon-only ${panelOpen ? 'active' : ''} ${isSettingsFocused ? 'tv-focused' : ''}`}
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
