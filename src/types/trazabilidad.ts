/** Tipos compartidos por la consulta de notificaciones visibles en el historial. */

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** Estados que la interfaz puede mostrar para un envío, incluida la degradación. */
export type EstadoEnvio = NotificationStatus | 'en_preparacion';

export const ETIQUETAS_ESTADO_ENVIO: Readonly<Record<EstadoEnvio, string>> = {
  pending: 'Pendiente de envío',
  sent: 'Enviado',
  failed: 'No se pudo enviar',
  en_preparacion: 'En preparación',
};

/** Forma tolerada de `GET /dossiers/{id}/notifications` (planos y agrupados). */
export interface NotificationResponse {
  notificationId?: unknown;
  id?: unknown;
  eventId?: unknown;
  dossierId?: unknown;
  occurredAt?: unknown;
  createdAt?: unknown;
  sentAt?: unknown;
  type?: unknown;
  summary?: unknown;
  versionLabel?: unknown;
  status?: unknown;
  recipients?: unknown;
  destinatarios?: unknown;
  recipientEmail?: unknown;
  recipientEmails?: unknown;
  estadoAnterior?: unknown;
  estadoNuevo?: unknown;
  /** Forma agrupada que devuelve `GET /dossiers/{id}/notifications` en Back End. */
  historyId?: unknown;
  transition?: unknown;
  fromState?: unknown;
  toState?: unknown;
}

/** Correo notificado con su propio estado de envío; nunca incluye `lastError`. */
export interface DestinatarioNotificacion {
  email: string;
  status: EstadoEnvio;
}

/** Registro que la pantalla renderiza sin exponer errores técnicos. */
export interface HistorialItem {
  notificationId: string;
  eventId: string | null;
  dossierId: string | null;
  occurredAt: string;
  type: string | null;
  summary: string | null;
  versionLabel: string | null;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  destinatarios: DestinatarioNotificacion[];
}

export interface NotificationsFilters {
  limit?: number;
  cursor?: string;
}
