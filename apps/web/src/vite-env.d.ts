/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API base; default '' = same origin (Vite proxy in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** MapLibre style URL. */
  readonly VITE_MAP_STYLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
