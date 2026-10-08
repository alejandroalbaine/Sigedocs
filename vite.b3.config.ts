import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  test: {
    include: ['src/test/b3.integration.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
