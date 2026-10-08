/// <reference types="vite/client" />

/** Versión de package.json, inyectada por Vite en el build. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Origen de SIGESDOC_BACKEND, sin rutas. Vacío = mismo origen. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
