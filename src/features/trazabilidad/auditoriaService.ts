/**
 * Servicios de trazabilidad (B7): `GET /api/v1/dossiers/{dossierId}/audit-events`.
 *
 * Igual que en observaciones, la interfaz no sabe de dónde vienen los eventos:
 * elige el servicio simulado o el real según `USE_MOCK_DATA`.
 */
import { MOCK_LATENCY_MS, USE_MOCK_DATA } from '../../common/config.ts';
import { domainRequest } from '../../common/api/domainClient.ts';
import {
  validarEventosAuditoria,
  type EventoAuditoriaCrudo,
  type FiltrosAuditoria,
} from './auditContract.ts';
import { EVENTOS_AUDITORIA_SIMULADOS } from './auditoria.mock.ts';
import type { EventoTrazabilidad } from './catalogos.ts';

export interface ContextoExpediente {
  dossierId: string;
  codigo: string;
  titulo: string;
}

export interface AuditoriaService {
  listar(expediente: ContextoExpediente, filtros: FiltrosAuditoria): Promise<EventoTrazabilidad[]>;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * El contrato de B7 no devuelve correo ni rol del actor, ni los estados anterior/nuevo,
 * así que se dejan vacíos y la tabla los oculta. Cuando el backend los publique, se
 * completan aquí sin tocar la tabla. `user` es `null` cuando el evento lo produjo el
 * sistema, no una sesión.
 */
export function aEventoTrazabilidad(
  evento: EventoAuditoriaCrudo,
  expediente: { codigo: string; titulo: string },
): EventoTrazabilidad {
  return {
    id: evento.eventId,
    fecha: evento.occurredAt,
    accion: evento.type,
    expedienteCodigo: expediente.codigo,
    expedienteTitulo: expediente.titulo,
    usuarioNombre: evento.user?.name ?? 'Sistema',
    usuarioCorreo: '',
    usuarioRol: '',
    version: evento.versionLabel ?? '',
    estadoAnterior: null,
    estadoNuevo: '',
    observacion: evento.summary,
    evidencia: null,
  };
}

function cumpleFiltros(evento: EventoAuditoriaCrudo, filtros: FiltrosAuditoria): boolean {
  const dia = evento.occurredAt.slice(0, 10);
  return (
    (!filtros.type || evento.type === filtros.type) &&
    (!filtros.from || dia >= filtros.from) &&
    (!filtros.to || dia <= filtros.to) &&
    (!filtros.versionId || evento.versionLabel === filtros.versionId)
  );
}

/** Construye el query string del contrato; solo incluye lo que se está filtrando. */
export function queryAuditoria(filtros: FiltrosAuditoria): string {
  const partes = [
    filtros.type ? `type=${encodeURIComponent(filtros.type)}` : '',
    filtros.from ? `from=${encodeURIComponent(filtros.from)}` : '',
    filtros.to ? `to=${encodeURIComponent(filtros.to)}` : '',
    filtros.versionId ? `versionId=${encodeURIComponent(filtros.versionId)}` : '',
    `limit=${filtros.limit}`,
    filtros.cursor ? `cursor=${encodeURIComponent(filtros.cursor)}` : '',
  ].filter(Boolean);
  return `?${partes.join('&')}`;
}

export const auditoriaServiceMock: AuditoriaService = {
  async listar(expediente, filtros) {
    await esperar(MOCK_LATENCY_MS);
    const eventos = EVENTOS_AUDITORIA_SIMULADOS.filter((evento) => cumpleFiltros(evento, filtros));
    const desde = filtros.cursor ? Number(filtros.cursor) || 0 : 0;
    return eventos
      .slice(desde, desde + filtros.limit)
      .map((evento) => aEventoTrazabilidad(evento, expediente));
  },
};

export const auditoriaServiceApi: AuditoriaService = {
  async listar(expediente, filtros) {
    const { data } = await domainRequest<unknown>(
      `/dossiers/${encodeURIComponent(expediente.dossierId)}/audit-events${queryAuditoria(filtros)}`,
    );
    return validarEventosAuditoria(data).map((evento) => aEventoTrazabilidad(evento, expediente));
  },
};

export const auditoriaService: AuditoriaService = USE_MOCK_DATA ? auditoriaServiceMock : auditoriaServiceApi;
