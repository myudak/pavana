/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API base; default '' = same origin (Vite proxy in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** MapLibre style URL override, light theme (default CARTO Voyager). */
  readonly VITE_MAP_STYLE_URL?: string;
  /** MapLibre style URL override, dark theme (default CARTO Dark Matter). */
  readonly VITE_MAP_STYLE_URL_DARK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
