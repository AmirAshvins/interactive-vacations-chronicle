import type { SolarState } from './solarEngine';

export const SOLAR_CLOCK_TRANSITION_MS = 450;
export const SOLAR_MANUAL_TRANSITION_MS = 100;

export interface SolarUiTheme {
  panelBg: string;
  panelBorder: string;
  panelText: string;
  panelMuted: string;
  panelSurface: string;
  dockBg: string;
  dockBorder: string;
  frameBorder: string;
  frameShadow: string;
  flightStroke: string;
  flightStrokeWidth: string;
  flightPlaneFill: string;
  flightPlaneStroke: string;
  landmassStroke: string;
  landmassStrokeWidth: string;
}

export function getSolarUiTheme(phase: SolarState['phase']): SolarUiTheme {
  const isDark = phase === 'night' || phase === 'twilight';

  if (isDark) {
    return {
      panelBg: 'rgba(18, 18, 20, 0.88)',
      panelBorder: 'rgba(255, 255, 255, 0.08)',
      panelText: '#e8e8ea',
      panelMuted: '#9ca3af',
      panelSurface: 'rgba(0, 0, 0, 0.2)',
      dockBg: 'rgba(22, 22, 24, 0.88)',
      dockBorder: 'rgba(255, 255, 255, 0.1)',
      frameBorder: 'rgba(255, 255, 255, 0.07)',
      frameShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.15)',
      flightStroke: '#d4af37',
      flightStrokeWidth: '1.25',
      flightPlaneFill: '#e5c76a',
      flightPlaneStroke: 'rgba(255, 255, 255, 0.9)',
      landmassStroke: 'rgba(212, 175, 55, 0.18)',
      landmassStrokeWidth: '0.35',
    };
  }

  return {
    panelBg: 'rgba(255, 255, 255, 0.94)',
    panelBorder: 'rgba(60, 48, 32, 0.1)',
    panelText: '#2c2c2a',
    panelMuted: '#7c7c78',
    panelSurface: 'rgba(60, 48, 32, 0.04)',
    dockBg: 'rgba(255, 255, 255, 0.92)',
    dockBorder: 'rgba(60, 48, 32, 0.1)',
    frameBorder: 'rgba(92, 72, 48, 0.12)',
    frameShadow: 'inset 0 0 48px rgba(92, 72, 48, 0.03)',
    flightStroke: '#a58452',
    flightStrokeWidth: '1.15',
    flightPlaneFill: '#b8956a',
    flightPlaneStroke: 'rgba(255, 255, 255, 0.75)',
    landmassStroke: 'rgba(92, 72, 48, 0.14)',
    landmassStrokeWidth: '0.35',
  };
}
