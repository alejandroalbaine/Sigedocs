/**
 * Configuración pública del navegador. Vite la fija en el build desde las variables
 * VITE_*; nunca contiene secretos. El build ya rechaza un VITE_API_BASE_URL con rutas.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Interruptor mock/API de las pantallas de observaciones (B6) y auditoría (B7).
 * `true` = datos simulados; `false` = endpoints reales del backend.
 * Solo se apaga cuando el backend publica ambos contratos.
 */
export const USE_MOCK_DATA: boolean = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/** Latencia que emula la red en el servicio simulado, para exercised los estados de carga. */
export const MOCK_LATENCY_MS: number = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 350);

/**
 * Expediente que ambas pantallas consultan. B6 y B7 son rutas por expediente
 * (`/dossiers/{dossierId}/...`); hasta que exista el selector de expediente se usa este valor.
 */
export const ACTIVE_DOSSIER_ID: string = import.meta.env.VITE_DOSSIER_ID ?? 'dossier-demo';
