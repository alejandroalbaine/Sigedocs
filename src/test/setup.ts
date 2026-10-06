import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom no implementa canvas: los gráficos simplemente no dibujan en las pruebas.
HTMLCanvasElement.prototype.getContext = () => null;

// jsdom no calcula posiciones ni implementa el desplazamiento del navegador.
HTMLElement.prototype.scrollIntoView = vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>();

// Las páginas documentales consultan `GET /api/v1/dossiers` con `fetch` global. Sin un
// `stubDossiers` explícito, el backend de prueba responde una lista vacía.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [],
            meta: {
              pagination: {
                next: null,
                previous: null,
                hasMore: false,
                limit: 25,
                returnedCount: 0,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
