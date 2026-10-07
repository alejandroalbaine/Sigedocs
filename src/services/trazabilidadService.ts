import { ApiError } from '../common/api/errors.ts';
import { ContractError } from '../common/api/contract.ts';
import { domainRequest } from '../common/api/domainClient.ts';
import {
  NOTIFICATION_STATUSES,
  type DestinatarioNotificacion,
  type EstadoEnvio,
  type HistorialItem,
  type NotificationResponse,
  type NotificationStatus,
  type NotificationsFilters,
} from '../types/trazabilidad.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const parsed = optionalText(value);
    if (parsed) return parsed;
  }
  return null;
}

/** Estado individual de un destinatario; lo desconocido degrada a `en_preparacion`. */
function estadoEnvio(value: unknown, porDefecto: EstadoEnvio): EstadoEnvio {
  if (typeof value !== 'string') return porDefecto;
  const normalized = value.trim().toLowerCase();
  if ((NOTIFICATION_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as NotificationStatus;
  }
  return 'en_preparacion';
}

/**
 * Cada destinatario conserva su propio estado (`sent`, `pending`, `failed`); si el
 * backend solo trae cadenas, se aplica el estado del aviso completo. `lastError`
 * jamás se copia al resultado.
 */
function destinatariosDe(value: unknown, porDefecto: EstadoEnvio): DestinatarioNotificacion[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') {
    return value.trim() ? [{ email: value.trim(), status: porDefecto }] : [];
  }
  if (!Array.isArray(value)) throw new ContractError('notification recipients');

  const vistos = new Set<string>();
  const destinatarios: DestinatarioNotificacion[] = [];
  for (const item of value) {
    let email: string | null;
    let status: EstadoEnvio;
    if (typeof item === 'string') {
      email = item.trim() || null;
      status = porDefecto;
    } else if (isRecord(item)) {
      email = firstText(item.email, item.correo, item.address, item.direccion);
      status = estadoEnvio(item.status, porDefecto);
    } else {
      continue;
    }
    if (!email || vistos.has(email)) continue;
    vistos.add(email);
    destinatarios.push({ email, status });
  }
  return destinatarios;
}

function nombreDeEstado(value: unknown): string | null {
  if (isRecord(value)) return optionalText(value.name);
  return optionalText(value);
}

/**
 * Forma real de `GET /dossiers/{dossierId}/notifications`: agrupa los destinatarios por
 * cambio de estado (`historyId`, `transition`, `fromState`/`toState`, `recipients[]`).
 * Tampoco aquí se expone `lastError`.
 */
function normalizarGrupo(value: Record<string, unknown>): HistorialItem {
  const notificationId = firstText(value.historyId, value.notificationId, value.id);
  const occurredAt = firstText(value.occurredAt, value.createdAt);
  if (!notificationId) throw new ContractError('notification historyId');
  if (!occurredAt) throw new ContractError('notification occurredAt');

  const transicion = isRecord(value.transition) ? value.transition : null;
  const estadoAnterior = nombreDeEstado(value.fromState);
  const estadoNuevo = nombreDeEstado(value.toState);
  const type = firstText(transicion?.name, transicion?.code) ?? optionalText(value.type);
  const summary =
    estadoAnterior && estadoNuevo
      ? `${estadoAnterior} → ${estadoNuevo}`
      : (type ?? optionalText(value.summary));

  return {
    notificationId,
    eventId: optionalText(value.eventId),
    dossierId: optionalText(value.dossierId),
    occurredAt,
    type,
    summary,
    versionLabel: optionalText(value.versionLabel),
    estadoAnterior,
    estadoNuevo,
    destinatarios: destinatariosDe(value.recipients, 'en_preparacion'),
  };
}

/**
 * Adapta la respuesta de notifications y omite deliberadamente `lastError`.
 * El error técnico nunca forma parte del objeto que recibe la interfaz.
 */
export function normalizarNotificacion(value: unknown): HistorialItem {
  if (!isRecord(value)) throw new ContractError('notification');

  if (typeof value.historyId === 'string' && value.historyId.trim()) {
    return normalizarGrupo(value);
  }

  const raw = value as NotificationResponse;
  const notificationId = firstText(raw.notificationId, raw.id, raw.eventId);
  const occurredAt = firstText(raw.occurredAt, raw.createdAt, raw.sentAt);
  if (!notificationId) throw new ContractError('notification notificationId');
  if (!occurredAt) throw new ContractError('notification occurredAt');

  const status = estadoEnvio(raw.status, 'en_preparacion');
  return {
    notificationId,
    eventId: optionalText(raw.eventId),
    dossierId: optionalText(raw.dossierId),
    occurredAt,
    type: optionalText(raw.type),
    summary: optionalText(raw.summary),
    versionLabel: optionalText(raw.versionLabel),
    estadoAnterior: optionalText(raw.estadoAnterior),
    estadoNuevo: optionalText(raw.estadoNuevo),
    destinatarios: destinatariosDe(
      raw.recipients ?? raw.destinatarios ?? raw.recipientEmails ?? raw.recipientEmail,
      status,
    ),
  };
}

function addFilter(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') params.set(key, String(value));
}

export function notificationsPath(dossierId: string, filters: NotificationsFilters = {}): string {
  if (!dossierId.trim()) throw new TypeError('El dossierId es obligatorio.');
  const params = new URLSearchParams();
  addFilter(params, 'limit', filters.limit);
  addFilter(params, 'cursor', filters.cursor);
  const query = params.toString();
  return `/dossiers/${encodeURIComponent(dossierId)}/notifications${query ? `?${query}` : ''}`;
}

/** 404: el expediente no existe o está fuera del alcance del usuario. */
export function fueraDeAlcance(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Consulta las notificaciones visibles del expediente para la sección de correos. */
export async function consultarNotificaciones(
  dossierId: string,
  filters: NotificationsFilters = {},
): Promise<HistorialItem[]> {
  const { data } = await domainRequest<unknown>(notificationsPath(dossierId, filters));
  if (!Array.isArray(data)) throw new ContractError('notifications data');
  return data.map(normalizarNotificacion);
}
