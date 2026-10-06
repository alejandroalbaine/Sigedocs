import { useEffect, useState } from 'react';
import { dossiersApi, esRutaPendiente, type DossierFilters } from '../../common/api/dossiers.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Dossier } from './types.ts';

export type { DossierFilters };

interface Resultado {
  clave: string;
  items: Dossier[];
  nextCursor: string | null;
  error: string;
  pendiente: boolean;
}

/**
 * Una página de expedientes para Gestión y Búsqueda. Los filtros viajan al servidor y la
 * paginación es por cursor: `next` avanza con el cursor que devolvió el servidor y `previous`
 * retrocede por los cursores ya vistos. Al cambiar los filtros se vuelve a la primera página.
 * Quien necesite todos los expedientes (Panel, Reportes…) sigue usando `useDossiers`.
 */
export function useDossiersPaginados(filters: DossierFilters = {}, habilitado = true) {
  const { search = '', currentState = '', academicLevel = '', schoolCode = '' } = filters;
  const filterKey = JSON.stringify([search, currentState, academicLevel, schoolCode]);
  const [trail, setTrail] = useState<{ key: string; cursors: (string | null)[] }>({
    key: filterKey,
    cursors: [null],
  });
  const cursors = trail.key === filterKey ? trail.cursors : [null];
  const cursor = cursors[cursors.length - 1] ?? null;
  const clave = JSON.stringify([filterKey, cursor]);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let active = true;
    const controller = new AbortController();
    dossiersApi
      .page({ search, currentState, academicLevel, schoolCode }, cursor, controller.signal)
      .then(({ data, nextCursor }) => {
        if (active) {
          setResultado({ clave, items: data, nextCursor, error: '', pendiente: false });
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const pendiente = esRutaPendiente(reason);
        setResultado({
          clave,
          items: [],
          nextCursor: null,
          pendiente,
          error: pendiente ? '' : errorMessage(reason, 'No fue posible consultar los expedientes.'),
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [search, currentState, academicLevel, schoolCode, cursor, clave, habilitado]);

  const vigente = resultado?.clave === clave ? resultado : null;
  const nextCursor = vigente?.nextCursor ?? null;
  return {
    items: habilitado ? (vigente?.items ?? []) : [],
    loading: habilitado && vigente === null,
    error: habilitado ? (vigente?.error ?? '') : '',
    pendiente: habilitado && (vigente?.pendiente ?? false),
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
