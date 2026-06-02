/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" to load public/world-map-legacy.svg instead of the geo map */
  readonly VITE_MAP_LEGACY?: string;
}
