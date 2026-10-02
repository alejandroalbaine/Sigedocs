import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../../common/api/errors.ts';
import { FILTROS_AUDITORIA_VACIOS, type FiltrosAuditoria } from './auditContract.ts';
import {
  auditoriaService,
  type AuditoriaService,
  type ContextoExpediente,
} from './auditoriaService.ts';
import type { EventoTrazabilidad } from './catalogos.ts';

export interface EstadoAuditoria {
  eventos: EventoTrazabilidad[];
  cargando: boolean;
  error: string;
  filtros: FiltrosAuditoria;
  aplicar: (filtros: FiltrosAuditoria) => void;
  recargar: () => void;
}

/** Identifica la consulta de la que provienen los datos que hay en pantalla. */
function claveConsulta(
  expediente: ContextoExpediente | null,
  filtros: FiltrosAuditoria,
  intento: number,
): string {
  if (!expediente) return '';
  return [
    expediente.dossierId,
    filtros.type,
    filtros.from,
    filtros.to,
    filtros.versionId,
    filtros.limit,
    filtros.cursor,
    intento,
  ].join('|');
}

/** Respuesta guardada junto con la clave de la consulta que la produjo. */
interface Respuesta {
  clave: string;
  eventos: EventoTrazabilidad[];
  error: string;
}

/**
 * Consulta los eventos de trazabilidad del expediente. Los filtros viajan al backend
 * (`type`, `from`, `to`, `versionId`) cuando el servicio es el real; el simulado los
 * aplica en memoria con la misma semántica.
 *
 * Los datos se guardan etiquetados con la clave de la consulta que los trajo y el render
 * solo los muestra si esa clave sigue siendo la vigente. Así una respuesta lenta de una
 * consulta anterior no pisa la actual, y en el render en el que el expediente acaba de
 * cambiar se ve «cargando» en lugar de una tabla vacía que parecería el resultado.
 */
export function useAuditoria(
  expediente: ContextoExpediente | null,
  service: AuditoriaService = auditoriaService,
): EstadoAuditoria {
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_AUDITORIA_VACIOS);
  const [respuesta, setRespuesta] = useState<Respuesta>({ clave: '', eventos: [], error: '' });
  const [intento, setIntento] = useState(0);

  const clave = useMemo(
    () => claveConsulta(expediente, filtros, intento),
    [expediente, filtros, intento],
  );

  useEffect(() => {
    if (!expediente) return;
    service.listar(expediente, filtros).then(
      (eventos) => {
        setRespuesta({ clave, eventos, error: '' });
      },
      (motivo: unknown) => {
        setRespuesta({
          clave,
          eventos: [],
          error: errorMessage(motivo, 'No fue posible consultar la trazabilidad.'),
        });
      },
    );
  }, [expediente, service, filtros, clave]);

  const vigente = respuesta.clave === clave;
  const consultar = expediente !== null;

  const aplicar = useCallback((siguientes: FiltrosAuditoria) => {
    setFiltros(siguientes);
  }, []);

  const recargar = useCallback(() => {
    setIntento((valor) => valor + 1);
  }, []);

  return {
    eventos: vigente ? respuesta.eventos : [],
    cargando: consultar && !vigente,
    error: vigente ? respuesta.error : '',
    filtros,
    aplicar,
    recargar,
  };
}
