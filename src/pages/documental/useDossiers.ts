import { useEffect, useState } from 'react';
import { domainRequest } from '../../common/api/domainClient.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Dossier } from './types.ts';

export const PAGE_SIZE = 25;

/** Filtros que el servidor aplica (`GET /dossiers`); los vacíos no se envían. */
export interface DossierFilters {
  search?: string;
  currentState?: string;
  academicLevel?: string;
  schoolCode?: string;
}

export function dossiersPath(filters: DossierFilters, cursor: string | null, limit = PAGE_SIZE) {
  const params = new URLSearchParams({ limit: String(limit) });
  const entries: [string, string | undefined][] = [
    ['search', filters.search],
    ['currentState', filters.currentState],
    ['academicLevel', filters.academicLevel],
    ['schoolCode', filters.schoolCode],
  ];
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
  }
  if (cursor) params.set('cursor', cursor);
  return `/dossiers?${params.toString()}`;
}

/**
 * Una página de expedientes. Los filtros viajan al servidor y la paginación es por cursor:
 * `next` avanza con `meta.pagination.nextCursor` y `previous` retrocede por los cursores ya vistos.
 * Al cambiar los filtros se vuelve a la primera página.
 */
export function useDossiers(filters: DossierFilters = {}) {
  const { search = '', currentState = '', academicLevel = '', schoolCode = '' } = filters;
  const filterKey = JSON.stringify([search, currentState, academicLevel, schoolCode]);
  const [trail, setTrail] = useState<{ key: string; cursors: (string | null)[] }>({
    key: filterKey,
    cursors: [null],
  });
  const cursors = trail.key === filterKey ? trail.cursors : [null];
  const cursor = cursors[cursors.length - 1] ?? null;
  const requestKey = JSON.stringify([filterKey, cursor]);
  const [result, setResult] = useState<{
    key: string;
    items: Dossier[];
    nextCursor: string | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    let active = true;
    domainRequest<Dossier[]>(
      dossiersPath({ search, currentState, academicLevel, schoolCode }, cursor),
    )
      .then(({ data, meta }) => {
        if (active) {
          setResult({
            key: requestKey,
            items: data,
            nextCursor: meta?.pagination?.nextCursor ?? null,
            error: '',
          });
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setResult({
            key: requestKey,
            items: [],
            nextCursor: null,
            error: errorMessage(reason, 'No fue posible consultar los expedientes.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [search, currentState, academicLevel, schoolCode, cursor, requestKey]);
  const current = result?.key === requestKey ? result : null;
  const items = current?.items ?? [];
  const nextCursor = current?.nextCursor ?? null;
  const error = current?.error ?? '';
  const loading = import.meta.env.MODE !== 'test' && current === null;

  return {
    items,
    loading,
    error,
    page: cursors.length,
    hasNext: nextCursor !== null,
    hasPrevious: cursors.length > 1,
    next: () => {
      if (nextCursor === null) return;
      setTrail({ key: filterKey, cursors: [...cursors, nextCursor] });
    },
    previous: () => {
      if (cursors.length > 1) setTrail({ key: filterKey, cursors: cursors.slice(0, -1) });
    },
  };
}
