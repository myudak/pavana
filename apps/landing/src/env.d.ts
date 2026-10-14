interface ImportMetaEnv {
  /** URL of the React app (apps/web). */
  readonly PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
