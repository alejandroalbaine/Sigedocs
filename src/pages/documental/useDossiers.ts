import { useCallback, useEffect, useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Dossier } from './types.ts';

interface Resultado {
  clave: string;
  items: Dossier[];
  error: string;
}

/** Expedientes visibles para el usuario (`GET /dossiers`), validados contra el contrato. */
export function useDossiers(query = '') {
  const [version, setVersion] = useState(0);
  const clave = `${query}#${String(version)}`;
  const [resultado, setResultado] = useState<Resultado>({ clave: '', items: [], error: '' });

  useEffect(() => {
    let active = true;
    dossiersApi
      .list(query)
      .then(({ data }) => {
        if (active) setResultado({ clave, items: data, error: '' });
      })
      .catch((reason: unknown) => {
        if (active) {
          setResultado((actual) => ({
            clave,
            items: actual.items,
            error: errorMessage(reason, 'No fue posible consultar los expedientes.'),
          }));
        }
      });
    return () => {
      active = false;
    };
  }, [query, clave]);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);
  return {
    items: resultado.items,
    loading: resultado.clave !== clave,
    error: resultado.error,
    reload,
  };
}
