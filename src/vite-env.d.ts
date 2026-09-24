/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen de SIGESDOC_BACKEND, sin rutas. Vacío = mismo origen. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
