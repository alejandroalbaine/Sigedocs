import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './errors.ts';
import { esRutaPendiente } from './dossiers.ts';

export interface Recurso<T> {
  data: T | null;
  loading: boolean;
  error: string;
  /** La ruta está en el contrato pero el backend aún no la implementa (404). */
  pendiente: boolean;
  reload: () => void;
}

interface Estado<T> {
  clave: string;
  data: T | null;
  error: string;
  pendiente: boolean;
}

/**
 * Carga un recurso del contrato distinguiendo un error real de una ruta aún no implementada.
 * `cargar` en `null` significa "no consultar todavía" (por ejemplo, una pestaña cerrada).
 */
export function useRecurso<T>(
  cargar: (() => Promise<{ data: T }>) | null,
  deps: readonly unknown[],
): Recurso<T> {
  const [version, setVersion] = useState(0);
  const clave = `${JSON.stringify(deps)}#${String(version)}`;
  const activo = cargar !== null;
  const [estado, setEstado] = useState<Estado<T>>({
    clave: '',
    data: null,
    error: '',
    pendiente: false,
  });

  useEffect(() => {
    if (!cargar) return;
    let vigente = true;
    cargar()
      .then(({ data }) => {
        if (vigente) setEstado({ clave, data, error: '', pendiente: false });
      })
      .catch((reason: unknown) => {
        if (!vigente) return;
        const pendiente = esRutaPendiente(reason);
        setEstado({ clave, data: null, pendiente, error: pendiente ? '' : errorMessage(reason) });
      });
    return () => {
      vigente = false;
    };
    // `cargar` es una función nueva en cada render; la identidad real la da `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, activo]);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);
  const vigente = estado.clave === clave;
  return {
    data: vigente || !activo ? estado.data : null,
    loading: activo && !vigente,
    error: vigente ? estado.error : '',
    pendiente: vigente && estado.pendiente,
    reload,
  };
}
