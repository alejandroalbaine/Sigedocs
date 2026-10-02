import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../../common/api/errors.ts';
import type { ExpedienteResumen } from '../dossiers/dossiersService.ts';
import { observacionesService, type ObservacionesService } from './observacionesService.ts';
import type { Observacion } from './types.ts';

export interface EstadoObservaciones {
  observaciones: Observacion[];
  cargando: boolean;
  error: string;
  recargar: () => void;
}

/** Identifica la consulta de la que provienen los datos que hay en pantalla. */
function claveConsulta(
  expediente: ExpedienteResumen | null,
  versionId: string,
  intento: number,
): string {
  if (!expediente) return '';
  return [expediente.dossierId, versionId, intento].join('|');
}

/** Respuesta guardada junto con la clave de la consulta que la produjo. */
interface Respuesta {
  clave: string;
  observaciones: Observacion[];
  error: string;
}

/**
 * Carga las observaciones del expediente indicado.
 *
 * Los datos se guardan etiquetados con la clave de la consulta que los trajo y el render
 * solo los muestra si esa clave sigue siendo la vigente. Así una respuesta lenta de una
 * consulta anterior no pisa la actual, y en el render en el que el expediente o la
 * versión acaban de cambiar se ve «cargando» en lugar de una lista vacía que parecería el
 * resultado definitivo.
 */
export function useObservaciones(
  expediente: ExpedienteResumen | null,
  service: ObservacionesService = observacionesService,
  versionId?: string,
): EstadoObservaciones {
  const [respuesta, setRespuesta] = useState<Respuesta>({ clave: '', observaciones: [], error: '' });
  const [intento, setIntento] = useState(0);

  const clave = useMemo(
    () => claveConsulta(expediente, versionId ?? '', intento),
    [expediente, versionId, intento],
  );

  useEffect(() => {
    if (!expediente) return;
    service.listar(expediente, versionId).then(
      (observaciones) => {
        setRespuesta({ clave, observaciones, error: '' });
      },
      (motivo: unknown) => {
        setRespuesta({
          clave,
          observaciones: [],
          error: errorMessage(motivo, 'No fue posible consultar las observaciones.'),
        });
      },
    );
  }, [expediente, service, versionId, clave]);

  const vigente = respuesta.clave === clave;

  const recargar = useCallback(() => {
    setIntento((valor) => valor + 1);
  }, []);

  return {
    observaciones: vigente ? respuesta.observaciones : [],
    cargando: expediente !== null && !vigente,
    error: vigente ? respuesta.error : '',
    recargar,
  };
}
