/** Tipos compartidos por la consulta de notificaciones visibles en el historial. */

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** Estado normalizado que puede usar la interfaz para mostrar el envío. */
export const ESTADOS_ENVIO = ['enviado', 'pendiente', 'fallido', 'en_preparacion'] as const;

export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export const ETIQUETAS_ESTADO_ENVIO: Readonly<Record<EstadoEnvio | NotificationStatus, string>> = {
  pending: 'Pendiente de envío',
  sent: 'Enviado',
  failed: 'No se pudo enviar',
  enviado: 'Enviado',
  pendiente: 'Pendiente de envío',
  fallido: 'No se pudo enviar',
  en_preparacion: 'En preparación',
};

/** Respuesta tolerada mientras el contrato de notifications se incorpora a develop. */
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

/** Registro que la pantalla puede renderizar sin exponer errores técnicos. */
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
  destinatarios: string[];
  status: NotificationStatus | 'en_preparacion';
  estadoEnvio: EstadoEnvio;
  etiquetaEstadoEnvio: string;
}

export interface NotificationsFilters {
  limit?: number;
  cursor?: string;
}

export interface HistorialPage {
  items: HistorialItem[];
  nextCursor: string | null;
  limit: number;
  sourceStatus: 'ready' | 'en_preparacion';
}
