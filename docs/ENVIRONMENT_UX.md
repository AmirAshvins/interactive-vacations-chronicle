# Environment UX — TV / Mobile / Desktop

This document is the master plan for multi-platform support in the Bedrood Azizi Travelogue.

## Three independent axes

| Axis | Setting | Purpose |
|------|---------|---------|
| **Detected platform** | Automatic | `tv` \| `mobile` \| `desktop` from UA + viewport + pointer |
| **TV interaction** | Auto / On / Off | D-pad focus, spatial map nav, back stack |
| **Mobile layout** | Auto / On / Off | Bottom sheets, full-bleed map, thumb zones |
| **TV screensaver** | On / Off | Auto-hide HUD after idle (existing behavior) |

Detection lives in `src/utils/detectEnvironment.ts`. Effective flags are applied on `<html>`:

- `env-tv-interaction`
- `env-mobile-layout`
- `env-desktop-layout`
- `data-platform="tv|mobile|desktop"`

**Shipping defaults (after TV Phase 1):**

- `tvInteraction: 'auto'`
- `mobileLayout: 'auto'`

**Debug default (current):** `tvInteraction: 'on'` so desktop devs see focus chrome.

---

## Desktop (reference experience)

**Layout**

- Map: inset stage with margins (`map-stage`)
- Chronicle / Settings: right floating panel (`RightPanel`)
- Pin cards: anchored above pins, draggable header
- Control dock: bottom-right

**Input**

- Mouse: hover, click, drag pins when card open
- Keyboard: optional shortcuts later
- Scroll: chronicle virtual list

**No change goal:** preserve current aesthetic; env flags mostly off.

---

## TV (living room)

### A. TV Screensaver (done)

- Idle 8s → hide HUD
- Any key / pointer → restore without losing state

### B. TV Remote Navigation (Phase 1 — next)

**Focus zones (roving tabindex)**

1. Control dock (Settings)
2. Right panel — tabs → virtual chronicle list → actions
3. Map pins (spatial, not DOM order)
4. Open pin cards — close, carousel, “Open chronicle”

**Keys**

| Key | Action |
|-----|--------|
| Arrow* | Move focus in zone / spatial on map |
| Enter | Activate |
| Escape / Backspace | Back one level (stack) |
| (optional) Home | Focus dock |

**Map**

- Arrow keys pick nearest pin in screen direction
- Focused pin: scale + label
- Enter → open card; no drag reposition on TV
- Optional: hold arrow to pan; +/- zoom

**Settings on TV**

- Toggles: Left/Right
- Home city / material: vertical lists (no `<select>`)
- Defer trip editor or offer city-picker-only flow

**Chrome**

- 48px min targets
- Persistent hint bar (debug bar → production “OK · Back” legend)
- No hover-only controls (e.g. chronicle edit pencil always visible when focused)

### C. TV detection (done)

Signals: TV UA (Tizen, webOS, Fire TV, etc.), `(display-mode: tv)`, large viewport + coarse pointer + no hover.

---

## Mobile (phone / narrow)

### Layout targets

| Component | Desktop | Mobile |
|-----------|---------|--------|
| Right panel | Fixed right card | **Bottom sheet** (72vh max), swipe to dismiss |
| Trip dialog | Center modal | **Full-height bottom sheet** |
| Pin card | Floating near pin | **Bottom sheet** or compact sheet over map |
| Control dock | Bottom-right | **Bottom center** tab bar (Chronicle · Map · Settings) |
| Map | Inset margins | **Edge-to-edge**, safe areas |

### Map on mobile

- Full viewport height under optional top bar
- Pinch zoom (touch) + double-tap reset
- Tap pin → sheet (not tiny floating card)
- Reduce flight animation cap further on low power

### Chronicle

- Virtual list (done) + touch scroll
- Swipe actions optional later (edit / delete)

### Settings

- Same bottom sheet shell as Chronicle
- Large toggles, list pickers for city

### Detection

- Viewport &lt; 768px OR mobile UA (non-tablet)
- `mobileLayout: 'auto'` enables CSS in `environments.css` (partial today)

---

## Shared architecture (implementation roadmap)

### Layer 0 — Foundation (current PR)

- [x] `detectEnvironment()`
- [x] Settings: `tvInteraction`, `mobileLayout`, `isTvScreensaver`
- [x] `EnvironmentProvider` + document classes
- [x] Settings UI + debug bar
- [x] Mobile layout CSS stubs

### Layer 1 — TV focus (browse-only)

- [x] `TvFocusProvider` + back stack
- [x] `spatialNav.ts` for pins
- [x] Focusable chronicle rows + scroll-into-view
- [x] Dock / panel tab order
- [ ] Default `tvInteraction` → `'auto'` (still `'on'` for desktop debug)

### Layer 2 — Mobile shells

- [ ] `BottomSheet` component (snap points, dismiss)
- [ ] `RightPanel` → sheet when `mobileLayout`
- [ ] `TripDialog` → sheet variant
- [ ] `TripDetailCard` → sheet on mobile
- [ ] Touch map gestures audit

### Layer 3 — Adaptive settings & editors

- [ ] `PickerList` replaces `<select>` on TV/mobile
- [ ] TV: browse-only; edit on desktop or companion
- [ ] Mobile: simplified trip form

### Layer 4 — Polish

- [ ] On-screen remote legend (TV)
- [ ] Safe area / notched phones
- [ ] `prefers-reduced-motion` per environment
- [ ] E2E smoke: resize across breakpoints

---

## Component matrix

| Component | Desktop | TV | Mobile |
|-----------|---------|-----|--------|
| `WorldMap` | drag pan | arrow pan, spatial pins | pinch, tap |
| `VirtualChronicleList` | scroll | focus rows | scroll |
| `RightPanel` | side panel | side + focus | bottom sheet |
| `TripDetailCard` | anchored | focus, no drag | bottom sheet |
| `TripDialog` | modal | hidden / simple | bottom sheet |
| `SettingsSidebar` | embedded | list pickers | sheet |
| `EnvironmentControls` | all | all | all |

---

## Testing checklist

**Desktop:** 1280×800 — panels float, hover works, no debug bar unless TV nav On.

**TV (simulated):** TV nav On, 1920×1080 — debug bar, focus rings, no hover-only UI.

**Mobile (simulated):** Mobile layout On or 375×812 — panel becomes bottom sheet, map full bleed.

**Auto:** Resize browser — `detected.label` updates in Settings; Auto modes follow detection.

**Real devices:** Samsung/LG browser, iOS Safari, Fire TV silk (when available).

---

## File map

```
src/utils/detectEnvironment.ts   — detection + resolve override
src/hooks/useEnvironment.ts      — resize listeners, html classes
src/context/EnvironmentContext.tsx
src/hooks/useAppSettings.ts      — persisted overrides
src/styles/environments.css      — layout tokens per env
src/components/EnvironmentControls.tsx
src/components/EnvironmentDebugBar.tsx
docs/ENVIRONMENT_UX.md           — this plan
```

Future:

```
src/hooks/useTvFocus.ts
src/utils/spatialNav.ts
src/components/BottomSheet.tsx
```
