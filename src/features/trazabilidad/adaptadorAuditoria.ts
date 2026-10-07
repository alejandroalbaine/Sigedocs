import type { HistorialItem } from '../../types/trazabilidad.ts';
import {
  ACCIONES,
  ESTADOS,
  type EventoTrazabilidad,
  type NotificacionCorreo,
} from './catalogos.ts';

/**
 * Puente entre la capa de datos de notificaciones (`GET /dossiers/{dossierId}/notifications`)
 * y el modelo que consume la interfaz. No se expone `lastError` ni detalles técnicos.
 */
export interface ContextoExpediente {
  codigo: string;
  titulo: string;
}

/**
 * Convierte el nombre que publica Back End (`transition.name`, `workflow_states.name`)
 * a la clave del catálogo local, para que la tabla pinte el mismo distintivo de siempre.
 * Si no hay coincidencia se conserva el texto del backend.
 */
function claveDeCatalogo(catalogo: Record<string, { etiqueta: string }>, nombre: string | null) {
  if (!nombre) return null;
  const coincidencia = Object.entries(catalogo).find(([, entrada]) => entrada.etiqueta === nombre);
  return coincidencia ? coincidencia[0] : nombre;
}

export function aNotificacionDesdeItem(item: HistorialItem): NotificacionCorreo {
  const notificacion: NotificacionCorreo = {
    destinatarios: item.destinatarios,
    estado: item.status,
  };
  return notificacion;
}

/** Convierte un ítem de notificaciones al modelo de trazabilidad que renderiza la tabla. */
export function aEventoDesdeNotificacion(
  item: HistorialItem,
  contexto?: ContextoExpediente,
): EventoTrazabilidad {
  return {
    id: item.notificationId,
    fecha: item.occurredAt,
    accion: claveDeCatalogo(ACCIONES, item.type) ?? 'notificacion',
    expedienteCodigo: contexto?.codigo ?? '',
    expedienteTitulo: contexto?.titulo ?? '',
    usuarioNombre: 'Sin usuario registrado',
    usuarioCorreo: '',
    usuarioRol: '',
    version: item.versionLabel ?? '',
    estadoAnterior: claveDeCatalogo(ESTADOS, item.estadoAnterior),
    estadoNuevo: claveDeCatalogo(ESTADOS, item.estadoNuevo) ?? '',
    observacion: item.summary,
    evidencia: null,
    notificacion: aNotificacionDesdeItem(item),
  };
}

/** Convierte una lista de notificaciones manteniendo el orden del backend. */
export function aEventosDesdeNotificaciones(
  items: readonly HistorialItem[],
  contexto?: ContextoExpediente,
): EventoTrazabilidad[] {
  return items.map((item) => aEventoDesdeNotificacion(item, contexto));
}
