import { vi } from 'vitest';
import { json, problem } from './backend.ts';

export type FetchHandler = (request: {
  url: URL;
  init: RequestInit;
  body: unknown;
}) => Response | Promise<Response>;

export interface FetchStub {
  /** Cada llamada como "MÉTODO /ruta?consulta". */
  calls: string[];
  /** Cuerpos JSON enviados, en orden. */
  bodies: unknown[];
  on: (route: string, handler: FetchHandler) => void;
}

/**
 * Sustituye `fetch` global para las pantallas que usan `domainRequest` (expedientes, usuarios).
 * Se registra por "MÉTODO /ruta" sin consulta; lo no registrado responde 404 Problem Details.
 */
export function stubFetch(routes: Record<string, FetchHandler> = {}): FetchStub {
  const handlers = new Map(Object.entries(routes));
  const calls: string[] = [];
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://localhost');
      const method = init.method ?? 'GET';
      calls.push(`${method} ${url.pathname}${url.search}`);
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      if (body !== undefined) bodies.push(body);
      const handler = handlers.get(`${method} ${url.pathname}`);
      return handler ? handler({ url, init, body }) : problem(404, 'RECURSO_NO_ENCONTRADO');
    }),
  );
  return {
    calls,
    bodies,
    on: (route, handler) => {
      handlers.set(route, handler);
    },
  };
}

export { json, problem };
