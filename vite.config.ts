/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Devuelve solo el origen de la API o '' (mismo origen). Rechaza rutas, credenciales,
 * query y fragmento para que un valor mal escrito falle en el build y no en producción.
 */
function apiOrigin(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('VITE_API_BASE_URL debe contener solo el origen HTTP o HTTPS, sin rutas.');
  }
  return url.origin;
}

/**
 * CSP del build como <meta>. Es la misma política que aplicaba el servidor Express retirado.
 * No se aplica en desarrollo porque el HMR de Vite inyecta scripts inline.
 * frame-ancestors y HSTS no funcionan en <meta>: los debe enviar el hosting como cabeceras.
 */
function contentSecurityPolicy(origin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self'${origin ? ` ${origin}` : ''}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  return {
    name: 'sigesdoc-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), contentSecurityPolicy(apiOrigin(env.VITE_API_BASE_URL))],
    css: {
      // Clases en kebab-case en el CSS (convención de Stylelint), camelCase en TypeScript.
      modules: { localsConvention: 'camelCaseOnly' },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
