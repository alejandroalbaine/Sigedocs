import { expect, test } from 'vitest';
import { dossier, json, stubApi } from '../../test/backend.ts';
import { dossiersApi } from './dossiers.ts';

test('consume el cursor next real y conserva los filtros en todas las páginas', async () => {
  const primero = dossier();
  const segundo = dossier({ dossierId: 'segundo', code: 'ECD-2026-0002' });
  const llamadas = stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) =>
      json({
        data: url.searchParams.has('cursor') ? [segundo] : [primero],
        meta: {
          pagination: {
            limit: 25,
            returnedCount: 1,
            hasMore: !url.searchParams.has('cursor'),
            next: url.searchParams.has('cursor') ? null : 'cursor+/=2',
            previous: null,
          },
        },
      }),
  });
  await expect(dossiersApi.listAll('&schoolCode=ESC-ING')).resolves.toEqual({
    data: [primero, segundo],
  });
  expect(llamadas).toHaveLength(2);
  expect(llamadas[1]?.url.searchParams.get('cursor')).toBe('cursor+/=2');
  for (const llamada of llamadas)
    expect(llamada.url.searchParams.get('schoolCode')).toBe('ESC-ING');
});

test('no duplica un expediente repetido entre páginas', async () => {
  const item = dossier();
  stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) =>
      json({
        data: [item],
        meta: { pagination: { limit: 25, next: url.searchParams.has('cursor') ? null : 'c2' } },
      }),
  });
  await expect(dossiersApi.listAll()).resolves.toEqual({ data: [item] });
});

test('un cursor repetido termina con error en lugar de consultar indefinidamente', async () => {
  const llamadas = stubApi({
    'GET /api/v1/dossiers': () =>
      json({ data: [dossier()], meta: { pagination: { limit: 25, next: 'repetido' } } }),
  });
  await expect(dossiersApi.listAll()).rejects.toThrow(/respuesta no válida/i);
  expect(llamadas).toHaveLength(2);
});

test('no entrega una colección parcial si falla la segunda página', async () => {
  stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) =>
      url.searchParams.has('cursor')
        ? json({ code: 'INTERNAL_ERROR' }, 500, 'application/problem+json')
        : json({ data: [dossier()], meta: { pagination: { limit: 25, next: 'c2' } } }),
  });
  await expect(dossiersApi.listAll()).rejects.toMatchObject({ status: 500 });
});
