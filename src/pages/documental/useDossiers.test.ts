import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { dossiersPath, useDossiers, type DossierFilters } from './useDossiers.ts';

const TOTAL = 60;
const all = Array.from({ length: TOTAL }, (_, index) => ({
  dossierId: `id-${index}`,
  code: `ECD-2026-${String(index).padStart(4, '0')}`,
  academicLevel: index % 3 === 0 ? 'associate' : 'bachelor',
  currentState: index % 2 === 0 ? { code: 'RECEIVED' } : { code: 'IN_REVIEW' },
}));

/** Servidor simulado: aplica filtros y cursor (desplazamiento) con el contrato `/dossiers`. */
function fakeServer(input: string) {
  const url = new URL(input, 'http://localhost');
  const q = url.searchParams;
  const limit = Number(q.get('limit'));
  const filtered = all.filter(
    (item) =>
      (!q.get('currentState') || item.currentState.code === q.get('currentState')) &&
      (!q.get('academicLevel') || item.academicLevel === q.get('academicLevel')),
  );
  const start = Number(q.get('cursor') ?? 0);
  const next = start + limit < filtered.length ? String(start + limit) : null;
  return Promise.resolve(
    new Response(
      JSON.stringify({
        data: filtered.slice(start, start + limit),
        meta: { pagination: { nextCursor: next, limit } },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

beforeEach(() => {
  vi.stubEnv('MODE', 'development');
  vi.stubGlobal('fetch', vi.fn(fakeServer));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('envía al servidor solo los filtros con valor y el cursor', () => {
  expect(dossiersPath({ currentState: 'RECEIVED', academicLevel: '' }, 'abc')).toBe(
    '/dossiers?limit=25&currentState=RECEIVED&cursor=abc',
  );
});

test('recorre más de 25 expedientes con el cursor del servidor', async () => {
  const { result } = renderHook(() => useDossiers());
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
});

test('los filtros de estado y nivel los aplica el servidor y reinician la paginación', async () => {
  const { result, rerender } = renderHook((filters: DossierFilters) => useDossiers(filters), {
    initialProps: {},
  });
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
  const calls = vi.mocked(fetch).mock.calls.map(([url]) => url as string);
  expect(calls.at(-1)).toContain('currentState=RECEIVED');
  expect(calls.at(-1)).toContain('academicLevel=bachelor');
  expect(calls.at(-1)).not.toContain('cursor=');
});
