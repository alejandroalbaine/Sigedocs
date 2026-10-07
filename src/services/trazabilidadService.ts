import { ApiError } from '../common/api/errors.ts';
import { ContractError } from '../common/api/contract.ts';
import { domainRequest } from '../common/api/domainClient.ts';
import {
  ETIQUETAS_ESTADO_ENVIO,
  NOTIFICATION_STATUSES,
  type EstadoEnvio,
  type HistorialItem,
  type HistorialPage,
  type NotificationResponse,
  type NotificationStatus,
  type NotificationsFilters,
} from '../types/trazabilidad.ts';

const ROUTE_UNAVAILABLE_STATUSES = new Set([404, 405, 501]);

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

function recipientList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) throw new ContractError('notification recipients');

  return [
    ...new Set(
      value.flatMap((item) => {
        if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
        if (!isRecord(item)) return [];
        const email = firstText(item.email, item.correo, item.address, item.direccion);
        return email ? [email] : [];
      }),
    ),
  ];
}

function notificationStatus(value: unknown): NotificationStatus | 'en_preparacion' {
  if (typeof value !== 'string') return 'en_preparacion';
  const normalized = value.trim().toLowerCase();
  if ((NOTIFICATION_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as NotificationStatus;
  }
  return 'en_preparacion';
}

function estadoEnvio(status: NotificationStatus | 'en_preparacion'): EstadoEnvio {
  if (status === 'sent') return 'enviado';
  if (status === 'failed') return 'fallido';
  if (status === 'pending') return 'pendiente';
  return 'en_preparacion';
}

function nombreDeEstado(value: unknown): string | null {
  if (isRecord(value)) return optionalText(value.name);
  return optionalText(value);
}

function recipientStatuses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    isRecord(item) && typeof item.status === 'string' ? [item.status.trim().toLowerCase()] : [],
  );
}

/**
 * Una transición notifica a varias personas con estados distintos: la fila muestra el peor
 * (`failed` gana a `pending`, `pending` a `sent`), de modo que un solo destinatario sin
 * enviar mantenga el aviso visible.
 */
function estadoAgregado(estados: readonly string[]): NotificationStatus | 'en_preparacion' {
  if (estados.includes('failed')) return 'failed';
  if (estados.includes('pending')) return 'pending';
  if (estados.includes('sent')) return 'sent';
  return 'en_preparacion';
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

  const status = estadoAgregado(recipientStatuses(value.recipients));
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
    destinatarios: recipientList(value.recipients),
    status,
    estadoEnvio: estadoEnvio(status),
    etiquetaEstadoEnvio: ETIQUETAS_ESTADO_ENVIO[status],
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

  const status = notificationStatus(raw.status);
  const normalizedState = estadoEnvio(status);
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
    destinatarios: recipientList(
      raw.recipients ?? raw.destinatarios ?? raw.recipientEmails ?? raw.recipientEmail,
    ),
    status,
    estadoEnvio: normalizedState,
    etiquetaEstadoEnvio: ETIQUETAS_ESTADO_ENVIO[status],
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

export function rutaNotificationsNoDisponible(error: unknown): boolean {
  return error instanceof ApiError && ROUTE_UNAVAILABLE_STATUSES.has(error.status);
}

export function historialEnPreparacion(): HistorialPage {
  return { items: [], nextCursor: null, limit: 0, sourceStatus: 'en_preparacion' };
}

/** Consulta las notificaciones visibles del expediente para la pantalla Historial. */
export async function consultarNotificaciones(
  dossierId: string,
  filters: NotificationsFilters = {},
): Promise<HistorialPage> {
  try {
    const { data, meta } = await domainRequest<unknown>(notificationsPath(dossierId, filters));
    if (!Array.isArray(data)) throw new ContractError('notifications data');

    const pagination = meta?.pagination;
    return {
      items: data.map(normalizarNotificacion),
      nextCursor: pagination?.nextCursor ?? null,
      limit: pagination?.limit ?? data.length,
      sourceStatus: 'ready',
    };
  } catch (error) {
    if (rutaNotificationsNoDisponible(error)) return historialEnPreparacion();
    throw error;
  }
}
