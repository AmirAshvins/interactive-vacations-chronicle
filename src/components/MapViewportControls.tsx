import type { ReactNode } from 'react';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { MapControlTarget } from '../context/TvFocusContext';

interface MapViewportControlsProps {
  showPanZoom: boolean;
  showReset: boolean;
  showCloseAll: boolean;
  showFullscreen: boolean;
  isFullscreen: boolean;
  openTripCount: number;
  isOverlayVisible: boolean;
  tvInteraction: boolean;
  focusedControl: MapControlTarget | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPan: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onReset: () => void;
  onCloseAll: () => void;
  onToggleFullscreen: () => void;
}

function ControlBtn({
  label,
  title,
  onClick,
  focused,
  className = '',
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  focused?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`map-hud-btn map-viewport-btn ${focused ? 'tv-focused' : ''} ${className}`.trim()}
      aria-label={label}
      title={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export default function MapViewportControls({
  showPanZoom,
  showReset,
  showCloseAll,
  showFullscreen,
  isFullscreen,
  openTripCount,
  isOverlayVisible,
  tvInteraction,
  focusedControl,
  onZoomIn,
  onZoomOut,
  onPan,
  onReset,
  onCloseAll,
  onToggleFullscreen,
}: MapViewportControlsProps) {
  if (!isOverlayVisible) return null;
  if (!showPanZoom && !showReset && !showCloseAll && !showFullscreen) return null;

  const focus = (target: MapControlTarget) => tvInteraction && focusedControl === target;

  return (
    <div
      className={`map-viewport-controls tv-hud-element ${tvInteraction ? 'map-viewport-controls--tv' : ''}`}
      role="toolbar"
      aria-label="Map navigation"
    >
      {showPanZoom && (
        <div className="map-viewport-pad" aria-label="Pan and zoom">
          <ControlBtn
            label="Zoom in"
            title="Zoom in"
            onClick={onZoomIn}
            focused={focus('zoom-in')}
            className="map-viewport-btn--zoom-in"
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
          </ControlBtn>
          <div className="map-viewport-pad-row">
            <ControlBtn
              label="Pan left"
              title="Pan left"
              onClick={() => onPan('left')}
              focused={focus('pan-left')}
            >
              <span aria-hidden>←</span>
            </ControlBtn>
            <ControlBtn
              label="Pan up"
              title="Pan up"
              onClick={() => onPan('up')}
              focused={focus('pan-up')}
            >
              <span aria-hidden>↑</span>
            </ControlBtn>
            <ControlBtn
              label="Pan right"
              title="Pan right"
              onClick={() => onPan('right')}
              focused={focus('pan-right')}
            >
              <span aria-hidden>→</span>
            </ControlBtn>
          </div>
          <div className="map-viewport-pad-row map-viewport-pad-row--bottom">
            <ControlBtn
              label="Pan down"
              title="Pan down"
              onClick={() => onPan('down')}
              focused={focus('pan-down')}
              className="map-viewport-btn--pan-down"
            >
              <span aria-hidden>↓</span>
            </ControlBtn>
          </div>
          <ControlBtn
            label="Zoom out"
            title="Zoom out"
            onClick={onZoomOut}
            focused={focus('zoom-out')}
            className="map-viewport-btn--zoom-out"
          >
            <Minus size={16} strokeWidth={2.25} aria-hidden />
          </ControlBtn>
        </div>
      )}

      <div className="map-viewport-actions">
        {showReset && (
          <button
            type="button"
            className={`map-hud-btn map-hud-btn--text map-reset-view-btn ${focus('reset') ? 'tv-focused' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
          >
            <RotateCcw size={12} strokeWidth={2} aria-hidden />
            Reset view
          </button>
        )}
        {showCloseAll && (
          <button
            type="button"
            className={`map-hud-btn map-hud-btn--text map-close-cards-btn ${focus('close-cards') ? 'tv-focused' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCloseAll();
            }}
          >
            <X size={12} strokeWidth={2} aria-hidden />
            Close cards ({openTripCount})
          </button>
        )}
        {showFullscreen && (
          <button
            type="button"
            className={`map-hud-btn map-hud-btn--text map-fullscreen-btn ${focus('fullscreen') ? 'tv-focused' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFullscreen();
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={12} strokeWidth={2} aria-hidden />
            ) : (
              <Maximize2 size={12} strokeWidth={2} aria-hidden />
            )}
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        )}
      </div>
    </div>
  );
}
