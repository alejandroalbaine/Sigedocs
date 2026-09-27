import { afterEach, expect, test, vi } from 'vitest';
import { domainRequest } from './domainClient.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('notifica globalmente cuando una consulta protegida pierde la sesión', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            type: '/problemas/sesion-ausente',
            title: 'No autenticado',
            status: 401,
            detail: 'Debe iniciar sesión.',
            codigo: 'SESION_AUSENTE',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
    ),
  );
  const listener = vi.fn();
  window.addEventListener('sigesdoc:session-expired', listener);

  await expect(domainRequest('/dossiers')).rejects.toMatchObject({ status: 401 });
  expect(listener).toHaveBeenCalledOnce();

  window.removeEventListener('sigesdoc:session-expired', listener);
});

test('normaliza la paginación final del contrato', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ dossierId: 'd1' }],
            meta: { pagination: { nextCursor: 'cursor-2', limit: 25 } },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );

  await expect(domainRequest('/dossiers')).resolves.toEqual({
    data: [{ dossierId: 'd1' }],
    meta: { pagination: { nextCursor: 'cursor-2', limit: 25 } },
  });
});

test('acepta temporalmente la paginación anterior y la entrega normalizada', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [],
            meta: { paginacion: { cursorSiguiente: null, limite: 100 } },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );

  await expect(domainRequest('/dossiers')).resolves.toMatchObject({
    meta: { pagination: { nextCursor: null, limit: 100 } },
  });
});

test('interpreta Problem Details final con code y errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            type: '/problems/validation-failed',
            title: 'Validation failed',
            status: 422,
            code: 'VALIDATION_FAILED',
            errors: [{ field: 'title', code: 'REQUIRED' }],
          }),
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
    ),
  );

  await expect(domainRequest('/dossiers')).rejects.toMatchObject({
    status: 422,
    code: 'VALIDATION_FAILED',
    fieldErrors: [{ field: 'title', code: 'REQUIRED' }],
  });
});

test('rechaza cuerpos JSON que no sean una envoltura de objeto', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } }),
    ),
  );

  await expect(domainRequest('/dossiers')).rejects.toThrow(/respuesta no válida/i);
});
