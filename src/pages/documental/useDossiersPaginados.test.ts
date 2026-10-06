import { act, renderHook, waitFor } from '@testing-library/react';
import { dossier, json, problem, stubApi } from '../../test/backend.ts';
import { dossiersApi } from '../../common/api/dossiers.ts';
import { useDossiersPaginados, type DossierFilters } from './useDossiersPaginados.ts';

const TOTAL = 60;
const todos = Array.from({ length: TOTAL }, (_, index) =>
  dossier({
    dossierId: `id-${String(index)}`,
    code: `ECD-2026-${String(index).padStart(4, '0')}`,
    academicLevel: index % 3 === 0 ? 'associate' : 'bachelor',
    currentState:
      index % 2 === 0
        ? { code: 'RECEIVED', name: 'Recepcionado', isEditable: true }
        : { code: 'IN_REVIEW', name: 'En revisión', isEditable: false },
  }),
);

/** Servidor simulado de `GET /dossiers`: aplica filtros y un cursor opaco (desplazamiento). */
function servidor() {
  return stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) => {
      const q = url.searchParams;
      const limit = Number(q.get('limit'));
      const filtrados = todos.filter(
        (item) =>
          (!q.get('currentState') || item.currentState.code === q.get('currentState')) &&
          (!q.get('academicLevel') || item.academicLevel === q.get('academicLevel')),
      );
      const inicio = Number(q.get('cursor')?.replace('c', '') ?? 0);
      const siguiente = inicio + limit < filtrados.length ? `c${String(inicio + limit)}` : null;
      return json({
        data: filtrados.slice(inicio, inicio + limit),
        meta: { pagination: { limit, next: siguiente, previous: null } },
      });
    },
  });
}

test('la función de API envía solo los filtros con valor y el cursor', async () => {
  const llamadas = servidor();
  await dossiersApi.page({ currentState: 'RECEIVED', academicLevel: '' }, 'c25');
  expect(llamadas[0]?.url.search).toBe('?limit=25&currentState=RECEIVED&cursor=c25');
});

test('la función de API rechaza una página que no cumple el contrato', async () => {
  stubApi({ 'GET /api/v1/dossiers': () => json({ data: [{ code: 'sin-forma' }] }) });
  await expect(dossiersApi.page()).rejects.toThrow(/respuesta no válida/i);
});

test('recorre más de 25 expedientes con el cursor del servidor, ida y vuelta', async () => {
  servidor();
  const { result } = renderHook(() => useDossiersPaginados());
  expect(result.current.loading).toBe(true);
  await waitFor(() => {
    expect(result.current.items).toHaveLength(25);
  });
  expect(result.current.hasNext).toBe(true);
  expect(result.current.hasPrevious).toBe(false);

  act(() => {
    result.current.next();
  });
  await waitFor(() => {
    expect(result.current.page).toBe(2);
    expect(result.current.items[0]?.dossierId).toBe('id-25');
  });
  act(() => {
    result.current.next();
  });
  await waitFor(() => {
    expect(result.current.items).toHaveLength(10);
  });
  expect(result.current.hasNext).toBe(false);

  act(() => {
    result.current.previous();
  });
  await waitFor(() => {
    expect(result.current.items[0]?.dossierId).toBe('id-25');
  });
  expect(result.current.page).toBe(2);
});

test('los filtros los aplica el servidor y reinician la paginación', async () => {
  const llamadas = servidor();
  const { result, rerender } = renderHook(
    (filtros: DossierFilters) => useDossiersPaginados(filtros),
    { initialProps: {} },
  );
  await waitFor(() => {
    expect(result.current.items).toHaveLength(25);
  });
  act(() => {
    result.current.next();
  });
  await waitFor(() => {
    expect(result.current.page).toBe(2);
  });

  rerender({ currentState: 'RECEIVED', academicLevel: 'bachelor' });
  await waitFor(() => {
    expect(result.current.page).toBe(1);
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(
      result.current.items.every(
        (item) => item.currentState.code === 'RECEIVED' && item.academicLevel === 'bachelor',
      ),
    ).toBe(true);
  });
  const ultima = llamadas.at(-1)?.url.searchParams;
  expect(ultima?.get('currentState')).toBe('RECEIVED');
  expect(ultima?.get('academicLevel')).toBe('bachelor');
  expect(ultima?.has('cursor')).toBe(false);
});

test('un 404 se informa como pendiente y no como error', async () => {
  stubApi({ 'GET /api/v1/dossiers': () => problem(404, 'NOT_FOUND') });
  const { result } = renderHook(() => useDossiersPaginados());
  await waitFor(() => {
    expect(result.current.pendiente).toBe(true);
  });
  expect(result.current.error).toBe('');
  expect(result.current.items).toEqual([]);
});

test('un error del servidor se informa sin datos', async () => {
  stubApi({ 'GET /api/v1/dossiers': () => problem(503, 'SERVICIO_NO_DISPONIBLE') });
  const { result } = renderHook(() => useDossiersPaginados());
  await waitFor(() => {
    expect(result.current.error).not.toBe('');
  });
  expect(result.current.items).toEqual([]);
  expect(result.current.loading).toBe(false);
});

test('deshabilitado no consulta al servidor', () => {
  const llamadas = servidor();
  const { result } = renderHook(() => useDossiersPaginados({}, false));
  expect(llamadas).toHaveLength(0);
  expect(result.current.loading).toBe(false);
});
