/**
 * Servicios de observaciones (B6): `POST|GET /dossiers/{dossierId}/observations`.
 *
 * La interfaz no sabe de dónde vienen los datos: `observacionesServiceMock` responde
 * con datos simulados y `observacionesServiceApi` consume el contrato real. La
 * elección la hace `observacionesService` según `USE_MOCK_DATA`.
 *
 * El catálogo de expedientes, versiones y secciones vive en `features/dossiers`,
 * que es de donde salen los datos que alimentan esta pantalla.
 */
import { USE_MOCK_DATA, MOCK_LATENCY_MS } from '../../common/config.ts';
import { domainRequest } from '../../common/api/domainClient.ts';
import {
  esObservable,
  dossiersServiceApi,
  dossiersServiceMock,
  type DossiersService,
  type ExpedienteResumen,
  type SeccionPlantilla,
  type VersionExpediente,
} from '../dossiers/dossiersService.ts';
import { cuerpoObservacion, mapearObservacion, mapearObservaciones } from './observacionesContract.ts';
import { OBSERVACIONES_SIMULADAS, type ObservacionSimulada } from './observaciones.mock.ts';
import type { NuevaObservacion, Observacion } from './types.ts';

export interface ObservacionesService {
  /** Expedientes con alguna versión observable (`IN_REVIEW` o `IN_REEVALUATION`). */
  listarExpedientes(): Promise<ExpedienteResumen[]>;
  /** Versiones observables de un expediente. */
  listarVersiones(expediente: ExpedienteResumen): Promise<VersionExpediente[]>;
  /** Secciones de la plantilla del expediente, para dirigir la observación. */
  listarSecciones(expediente: ExpedienteResumen): Promise<SeccionPlantilla[]>;
  /** Observaciones del expediente, opcionalmente de una versión. */
  listar(expediente: ExpedienteResumen, versionId?: string): Promise<Observacion[]>;
  /** Registra una observación y devuelve la ya persistida por el servidor. */
  registrar(expediente: ExpedienteResumen, nueva: NuevaObservacion): Promise<Observacion>;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function soloObservables(catalogo: DossiersService): Promise<ExpedienteResumen[]> {
  const expedientes = await catalogo.listar();
  const conEstado = await Promise.all(
    expedientes.map(async (expediente) => ({
      expediente,
      versiones: await catalogo.listarVersiones(expediente.dossierId),
    })),
  );
  return conEstado
    .filter((item) => item.versiones.some((version) => esObservable(version.state)))
    .map((item) => item.expediente);
}

/** Copia en memoria de las simuladas: un registro nuevo sobrevive a la siguiente consulta. */
let almacenSimulado: Observacion[] = OBSERVACIONES_SIMULADAS.map((item) => mapearObservacion(item));

export function reiniciarAlmacenSimulado(): void {
  almacenSimulado = OBSERVACIONES_SIMULADAS.map((item) => mapearObservacion(item));
}

export const observacionesServiceMock: ObservacionesService = {
  listarExpedientes: () => soloObservables(dossiersServiceMock),

  listarVersiones: async (expediente) => {
    const versiones = await dossiersServiceMock.listarVersiones(expediente.dossierId);
    return versiones.filter((version) => esObservable(version.state));
  },

  listarSecciones: (expediente) => dossiersServiceMock.listarSecciones(expediente.templateVersionId),

  async listar(expediente, versionId) {
    await esperar(MOCK_LATENCY_MS);
    return almacenSimulado.filter(
      (observacion) =>
        observacion.expedienteId === expediente.dossierId &&
        (!versionId || observacion.version.versionId === versionId),
    );
  },

  async registrar(expediente, nueva) {
    await esperar(MOCK_LATENCY_MS);
    const etiqueta =
      OBSERVACIONES_SIMULADAS.find((item) => item.version.versionId === nueva.versionId)?.version
        .label ?? 'v1.0';
    // El identificador simulado debe cumplir el mismo formato que el servidor: el mapper
    // rechaza cualquier `observationId` que no sea un UUID completo.
    const sufijo = Date.now().toString(16).padStart(12, '0').slice(-12);
    const creada = mapearObservacion({
      observationId: `bcf7ea08-7c9a-4865-8e6b-${sufijo}`,
      dossierId: expediente.dossierId,
      version: { versionId: nueva.versionId, label: etiqueta },
      text: nueva.texto.trim(),
      createdBy: { userId: '10000000-0000-4000-8000-000000000013', name: 'Especialista Curricular' },
      createdAt: new Date().toISOString(),
      sectionKey: nueva.seccion ?? null,
      fieldKey: nueva.campo ?? null,
      itemId: nueva.itemId ?? null,
    } satisfies ObservacionSimulada);
    almacenSimulado = [creada, ...almacenSimulado];
    return creada;
  },
};

/** Servicio real: `GET /dossiers`, `.../versions`, `POST|GET .../observations`. */
export const observacionesServiceApi: ObservacionesService = {
  listarExpedientes: () => soloObservables(dossiersServiceApi),

  async listarVersiones(expediente) {
    const versiones = await dossiersServiceApi.listarVersiones(expediente.dossierId);
    return versiones.filter((version) => esObservable(version.state));
  },

  listarSecciones: (expediente) => dossiersServiceApi.listarSecciones(expediente.templateVersionId),

  async listar(expediente, versionId) {
    const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
    const { data } = await domainRequest<unknown>(
      `/dossiers/${encodeURIComponent(expediente.dossierId)}/observations${query}`,
    );
    return mapearObservaciones(data);
  },

  async registrar(expediente, nueva) {
    const { data } = await domainRequest<unknown>(
      `/dossiers/${encodeURIComponent(expediente.dossierId)}/observations`,
      { method: 'POST', body: JSON.stringify(cuerpoObservacion(nueva)) },
    );
    // El autor y la fecha los fija el servidor a partir de la sesión.
    return mapearObservacion(data);
  },
};

/** Servicio que usa la interfaz, elegido por `USE_MOCK_DATA`. */
export const observacionesService: ObservacionesService = USE_MOCK_DATA
  ? observacionesServiceMock
  : observacionesServiceApi;
