import { useCallback, useEffect, useState } from 'react';
import { dossiersApi, esRutaPendiente } from '../../common/api/dossiers.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Dossier } from './types.ts';

interface Resultado {
  clave: string;
  items: Dossier[];
  error: string;
  pendiente: boolean;
}

/**
 * Expedientes visibles para el usuario (`GET /dossiers`), validados contra el contrato.
 * Un 404 significa que el servidor aún no publica el módulo: se informa como `pendiente`, no
 * como error. Con `habilitado` en `false` no se consulta (el rol no tiene `dossiers.read`).
 */
export function useDossiers(query = '', habilitado = true) {
  const [version, setVersion] = useState(0);
  const clave = `${query}#${String(version)}`;
  const [resultado, setResultado] = useState<Resultado>({
    clave: '',
    items: [],
    error: '',
    pendiente: false,
  });

  useEffect(() => {
    if (!habilitado) return;
    let active = true;
    const controller = new AbortController();
    dossiersApi
      .listAll(query, controller.signal)
      .then(({ data }) => {
        if (active) setResultado({ clave, items: data, error: '', pendiente: false });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const pendiente = esRutaPendiente(reason);
        setResultado((actual) => ({
          clave,
          items: pendiente ? [] : actual.items,
          pendiente,
          error: pendiente ? '' : errorMessage(reason, 'No fue posible consultar los expedientes.'),
        }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, clave, habilitado]);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);
  const vigente = resultado.clave === clave;
  return {
    items: habilitado ? resultado.items : [],
    loading: habilitado && !vigente,
    error: habilitado ? resultado.error : '',
    pendiente: habilitado && vigente && resultado.pendiente,
    reload,
  };
}
