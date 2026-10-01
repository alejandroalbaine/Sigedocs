import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { stubFetch } from './fetch.ts';

// jsdom no implementa canvas: los gráficos simplemente no dibujan en las pruebas.
HTMLCanvasElement.prototype.getContext = () => null;

// Ninguna prueba toca la red: lo no registrado responde 404 y cada prueba declara lo que necesita.
beforeEach(() => {
  stubFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
