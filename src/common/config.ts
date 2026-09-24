/**
 * Configuración pública del navegador. Vite la fija en el build desde las variables
 * VITE_*; nunca contiene secretos. El build ya rechaza un VITE_API_BASE_URL con rutas.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';
