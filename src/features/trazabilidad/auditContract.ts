/**
 * Contrato de auditoría (B7): `GET /api/v1/dossiers/{dossierId}/audit-events`.
 *
 * Fuente de verdad: `AuditEventResponse` en
 * `src/modules/dossiers/presentation/mappers/auditEvent.mapper.ts` y la entidad
 * `AuditEvent` (`domain/entities/AuditEvent.ts`) del backend.
 *
 * El backend emite exactamente seis tipos y un `user` que puede ser `null` cuando el
 * evento lo produjo el sistema. Si mañana publica más campos, se completan aquí.
 */
import type { BadgeTone } from '../../common/components/Badge/Badge.tsx';

/** Tipos de evento que emite el backend, en el orden de `AuditEventType`. */
export const TIPOS_EVENTO = [
  'dossier_created',
  'version_created',
  'content_updated',
  'state_changed',
  'assigned',
  'observation_added',
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export function esTipoEvento(valor: string): valor is TipoEvento {
  return (TIPOS_EVENTO as readonly string[]).includes(valor);
}

/**
 * Etiquetas y tonos para la interfaz. `TablaEventos` resuelve el tipo contra este
 * catálogo, así que los valores deben coincidir con los de `AuditEventType`.
 */
export const CATALOGO_TIPOS: Readonly<Record<TipoEvento, { etiqueta: string; tono: BadgeTone }>> = {
  dossier_created: { etiqueta: 'Expediente creado', tono: 'neutral' },
  version_created: { etiqueta: 'Versión creada', tono: 'neutral' },
  content_updated: { etiqueta: 'Contenido actualizado', tono: 'info' },
  state_changed: { etiqueta: 'Cambio de estado', tono: 'warning' },
  assigned: { etiqueta: 'Asignación', tono: 'info' },
  observation_added: { etiqueta: 'Observación registrada', tono: 'warning' },
};

/** Actor del evento. El backend lo resuelve a `{ userId, name }` o `null` si fue el sistema. */
export interface UsuarioAuditoria {
  userId: string;
  name: string;
}

export interface EventoAuditoriaCrudo {
  eventId: string;
  type: string;
  occurredAt: string;
  user: UsuarioAuditoria | null;
  versionLabel: string | null;
  summary: string;
}

export interface FiltrosAuditoria {
  type: string;
  from: string;
  to: string;
  versionId: string;
  limit: number;
  cursor: string;
}

export const FILTROS_AUDITORIA_VACIOS: FiltrosAuditoria = {
  type: '',
  from: '',
  to: '',
  versionId: '',
  limit: 50,
  cursor: '',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fueraDeContrato(campo: string): never {
  throw new Error(`Evento de auditoría fuera de contrato: ${campo}`);
}

/** Texto no vacío. */
function texto(value: unknown, campo: string): string {
  if (typeof value !== 'string' || value.length === 0) fueraDeContrato(campo);
  return value;
}

/** Texto que puede faltar: si falta, `null`. */
function textoOpcional(value: unknown, campo: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fueraDeContrato(campo);
  return value;
}

/** Identificador en formato UUID, como exige `eventId` y `user.userId`. */
function uuid(value: unknown, campo: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) fueraDeContrato(campo);
  return value;
}

/**
 * Valida un evento del servidor. Ante una forma inesperada lanza un error, que la
 * interfaz traduce al mensaje genérico de respuesta inválida, en lugar de mostrar
 * datos a medio construir.
 */
export function validarEventoAuditoria(value: unknown): EventoAuditoriaCrudo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fueraDeContrato('evento');
  const item = value as Record<string, unknown>;

  let user: UsuarioAuditoria | null = null;
  if (item.user !== null && item.user !== undefined) {
    if (typeof item.user !== 'object' || Array.isArray(item.user)) fueraDeContrato('user');
    const actor = item.user as Record<string, unknown>;
    user = { userId: uuid(actor.userId, 'user.userId'), name: texto(actor.name, 'user.name') };
  }

  return {
    eventId: uuid(item.eventId, 'eventId'),
    type: texto(item.type, 'type'),
    occurredAt: texto(item.occurredAt, 'occurredAt'),
    user,
    versionLabel: textoOpcional(item.versionLabel, 'versionLabel'),
    // El resumen puede ser cadena vacía: el backend lo permite.
    summary: typeof item.summary === 'string' ? item.summary : fueraDeContrato('summary'),
  };
}

export function validarEventosAuditoria(value: unknown): EventoAuditoriaCrudo[] {
  if (!Array.isArray(value)) throw new Error('Auditoría fuera de contrato: se esperaba una lista');
  return value.map(validarEventoAuditoria);
}
