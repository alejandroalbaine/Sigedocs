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

/**
 * Etiquetas de los tipos de evento del contrato de auditoría (B7). Coinciden con
 * `AuditEventType` del backend: seis tipos, sin `dossier_submitted` ni los de pilotaje,
 * que el flujo todavía no emite.
 */
export const TIPOS_AUDITORIA = {
  dossier_created: { etiqueta: 'Expediente creado', tono: 'neutral' },
  version_created: { etiqueta: 'Versión creada', tono: 'neutral' },
  content_updated: { etiqueta: 'Contenido actualizado', tono: 'info' },
  state_changed: { etiqueta: 'Cambio de estado', tono: 'warning' },
  assigned: { etiqueta: 'Asignación', tono: 'info' },
  observation_added: { etiqueta: 'Observación registrada', tono: 'warning' },
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
 * Evento de trazabilidad ya traducido. `accion` es el `type` del contrato B7; los campos
 * que el backend no publica (correo y rol del actor, estados de la transición, evidencia)
 * se quedan vacíos para no inventar datos. `observacion` es el `summary` del servidor.
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
}

export interface FiltrosTrazabilidad {
  expediente: string;
  usuario: string;
  /** `type` del contrato de auditoría (B7). Vacío = todos. */
  tipoEvento: string;
  desde: string;
  hasta: string;
  texto: string;
}

export const FILTROS_VACIOS: FiltrosTrazabilidad = {
  expediente: '',
  usuario: '',
  tipoEvento: '',
  desde: '',
  hasta: '',
  texto: '',
};
