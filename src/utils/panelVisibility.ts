/** HUD show/hide classes for panels — bottom sheet on mobile, side slide on desktop */
export function panelHudVisibilityClasses(
  mobileLayout: boolean,
  isOpen: boolean,
  isOverlayVisible: boolean,
): string {
  const visible = isOpen && isOverlayVisible;
  if (visible) {
    return mobileLayout ? 'right-panel--open' : 'translate-x-0';
  }
  return mobileLayout ? 'tv-hud-hidden-bottom pointer-events-none' : 'tv-hud-hidden-right pointer-events-none';
}
