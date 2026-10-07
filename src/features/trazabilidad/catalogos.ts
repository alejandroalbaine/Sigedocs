import type { BadgeTone } from '../../common/components/Badge/Badge.tsx';

/**
 * Acciones y estados del flujo curricular, portados de legacy/historial.js. Son provisionales:
 * el catálogo definitivo lo publicará el módulo de workflow del backend.
 */
export const ACCIONES = {
  recibir_programa: { etiqueta: 'Recibir programa', tono: 'info' },
  asignar_especialista: { etiqueta: 'Asignar especialista', tono: 'info' },
  iniciar_revision: { etiqueta: 'Iniciar revisión', tono: 'info' },
  detectar_incumplimiento: { etiqueta: 'Detectar incumplimiento', tono: 'warning' },
  persiste_incumplimiento: { etiqueta: 'Persiste el incumplimiento', tono: 'danger' },
  requiere_cambios: { etiqueta: 'Requiere cambios', tono: 'warning' },
  recibir_correccion: { etiqueta: 'Recibir corrección', tono: 'info' },
  iniciar_reevaluacion: { etiqueta: 'Iniciar reevaluación', tono: 'info' },
  aprobar_revision: { etiqueta: 'Aprobar revisión', tono: 'success' },
  aprobar_reevaluacion: { etiqueta: 'Aprobar reevaluación', tono: 'success' },
  publicar_pilotaje: { etiqueta: 'Publicar pilotaje', tono: 'success' },
  evaluar_pilotaje: { etiqueta: 'Evaluar pilotaje', tono: 'success' },
  cerrar_sin_cambios: { etiqueta: 'Cerrar sin cambios', tono: 'neutral' },
  implementar_programa: { etiqueta: 'Implementar programa', tono: 'neutral' },
  // Tipos de `GET /dossiers/{dossierId}/audit-events` (contratos/endpoints.md y ADR-016).
  dossier_created: { etiqueta: 'Expediente registrado', tono: 'info' },
  version_created: { etiqueta: 'Versión creada', tono: 'info' },
  content_updated: { etiqueta: 'Contenido actualizado', tono: 'info' },
  state_changed: { etiqueta: 'Cambio de estado', tono: 'info' },
  assigned: { etiqueta: 'Asignación de especialista', tono: 'info' },
  observation_added: { etiqueta: 'Observación registrada', tono: 'warning' },
} as const satisfies Record<string, { etiqueta: string; tono: BadgeTone }>;

export const ESTADOS = {
  recepcionado: { etiqueta: 'Recepcionado', tono: 'neutral' },
  asignado: { etiqueta: 'Asignado', tono: 'info' },
  en_revision: { etiqueta: 'En revisión', tono: 'info' },
  requiere_ajustes: { etiqueta: 'Requiere ajustes', tono: 'warning' },
  reenviado: { etiqueta: 'Reenviado', tono: 'info' },
  en_reevaluacion: { etiqueta: 'En reevaluación', tono: 'info' },
  aprobado_para_pilotaje: { etiqueta: 'Aprobado para pilotaje', tono: 'success' },
  en_pilotaje: { etiqueta: 'En pilotaje', tono: 'success' },
  evaluado: { etiqueta: 'Evaluado', tono: 'success' },
  definitivo: { etiqueta: 'Definitivo', tono: 'neutral' },
  implementado: { etiqueta: 'Implementado', tono: 'neutral' },
} as const satisfies Record<string, { etiqueta: string; tono: BadgeTone }>;

export type Accion = keyof typeof ACCIONES;
export type Estado = keyof typeof ESTADOS;

export function describir<K extends string>(
  catalogo: Record<K, { etiqueta: string; tono: BadgeTone }>,
  valor: string,
): { etiqueta: string; tono: BadgeTone } {
  return (
    (catalogo as Record<string, { etiqueta: string; tono: BadgeTone } | undefined>)[valor] ?? {
      etiqueta: valor,
      tono: 'neutral',
    }
  );
}

/**
 * Estado del aviso por correo que acompaña cada cambio de estado: se notifica a la
 * persona involucrada y a Dirección y Desarrollo Curricular. `pendiente` es un envío real
 * aún no resuelto; `en_preparacion` representa el evento cuyo detalle de envío todavía no
 * devuelve el backend, de modo que la vista degrada sola mientras la ruta `notifications`
 * no publique ese campo.
 */
export type EstadoEnvioCorreo = 'enviado' | 'pendiente' | 'fallido' | 'en_preparacion';

export interface NotificacionCorreo {
  destinatarios: string[];
  estado: EstadoEnvioCorreo;
  detalleError?: string;
}

/**
 * Forma provisional de un evento de trazabilidad (la que usaba la interfaz anterior).
 * El contrato real será `GET /api/v1/dossiers/{dossierId}/audit-events`; cuando se
 * publique, este tipo se reemplaza por el de contract.ts.
 */
export interface EventoTrazabilidad {
  id: string;
  fecha: string;
  accion: string;
  expedienteCodigo: string;
  expedienteTitulo: string;
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioRol: string;
  version: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  observacion: string | null;
  evidencia: string | null;
  /** Opcional hasta que el backend publique el detalle del aviso por correo. */
  notificacion?: NotificacionCorreo;
}

export interface FiltrosTrazabilidad {
  expediente: string;
  usuario: string;
  accion: string;
  estado: string;
  desde: string;
  hasta: string;
  texto: string;
}

export const FILTROS_VACIOS: FiltrosTrazabilidad = {
  expediente: '',
  usuario: '',
  accion: '',
  estado: '',
  desde: '',
  hasta: '',
  texto: '',
};
