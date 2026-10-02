/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen de SIGESDOC_BACKEND, sin rutas. Vacío = mismo origen. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * `true` sirve observaciones (B6) y auditoría (B7) desde datos simulados;
   * `false` consume los endpoints reales del backend.
   */
  readonly VITE_USE_MOCK_DATA?: string;
  /** Latencia artificial del servicio simulado, en milisegundos. */
  readonly VITE_MOCK_LATENCY_MS?: string;
  /** Expediente consultado por las pantallas de observaciones y trazabilidad. */
  readonly VITE_DOSSIER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
