/**
 * Estados del flujo `UNDERGRAD` (SIGESDOC_BACKEND, ADR-014 §2; RF-02 del Informe Módulo II).
 * Es la única clasificación de estados de la interfaz: Panel, Reportes, Gestión, Búsqueda y
 * Revisión la usan para que un mismo expediente cuente igual en todas las pantallas.
 * El nombre visible lo envía el backend en `currentState.name`; aquí solo se agrupa.
 */

export type GrupoEstado = 'recepcion' | 'revision' | 'ajustes' | 'aprobacion' | 'cierre' | 'otros';
export type TonoEstado = 'neutral' | 'info' | 'warning' | 'success' | 'final';

interface DefinicionEstado {
  nombre: string;
  grupo: Exclude<GrupoEstado, 'otros'>;
  tono: TonoEstado;
}

export const ESTADOS_UNDERGRAD: Readonly<Record<string, DefinicionEstado>> = {
  RECEIVED: { nombre: 'Recepcionado', grupo: 'recepcion', tono: 'neutral' },
  ASSIGNED: { nombre: 'Asignado', grupo: 'recepcion', tono: 'neutral' },
  IN_REVIEW: { nombre: 'En revisión', grupo: 'revision', tono: 'info' },
  CHANGES_REQUIRED: { nombre: 'Requiere ajustes', grupo: 'ajustes', tono: 'warning' },
  RESUBMITTED: { nombre: 'Reenviado', grupo: 'revision', tono: 'info' },
  IN_REEVALUATION: { nombre: 'En reevaluación', grupo: 'revision', tono: 'info' },
  APPROVED_FOR_PILOT: { nombre: 'Aprobado para pilotaje', grupo: 'aprobacion', tono: 'success' },
  IN_PILOT: { nombre: 'En pilotaje', grupo: 'aprobacion', tono: 'success' },
  EVALUATED: { nombre: 'Evaluado', grupo: 'aprobacion', tono: 'success' },
  FINAL: { nombre: 'Definitivo', grupo: 'cierre', tono: 'final' },
  ARCHIVED_IMPLEMENTED: { nombre: 'Archivado/Implementado', grupo: 'cierre', tono: 'final' },
};

export const GRUPOS_ESTADO: readonly { id: GrupoEstado; etiqueta: string; color: string }[] = [
  { id: 'recepcion', etiqueta: 'Recepción y asignación', color: 'var(--state-reception)' },
  { id: 'revision', etiqueta: 'En revisión', color: 'var(--state-review)' },
  { id: 'ajustes', etiqueta: 'Requiere ajustes', color: 'var(--state-changes)' },
  { id: 'aprobacion', etiqueta: 'Aprobación y pilotaje', color: 'var(--state-approval)' },
  { id: 'cierre', etiqueta: 'Definitivo', color: 'var(--state-final)' },
  { id: 'otros', etiqueta: 'Otros estados', color: 'var(--state-other)' },
];

/** Orden del recorrido principal (sin el ciclo de devolución), para el diagrama de etapas. */
export const ORDEN_UNDERGRAD = [
  'RECEIVED',
  'ASSIGNED',
  'IN_REVIEW',
  'CHANGES_REQUIRED',
  'RESUBMITTED',
  'IN_REEVALUATION',
  'APPROVED_FOR_PILOT',
  'IN_PILOT',
  'EVALUATED',
  'FINAL',
  'ARCHIVED_IMPLEMENTED',
] as const;

/** Siguiente paso esperado según las transiciones T1–T13 de ADR-014 §3. */
const PROXIMA_ACCION: Readonly<Record<string, string>> = {
  RECEIVED: 'Asignar a un especialista curricular (Dirección de Gestión Curricular)',
  ASSIGNED: 'Iniciar la revisión técnico-curricular (Especialista)',
  IN_REVIEW: 'Aplicar el checklist y devolver o aprobar para pilotaje',
  CHANGES_REQUIRED: 'Corregir y reenviar una nueva versión (Coordinación o Facilitador)',
  RESUBMITTED: 'Iniciar la reevaluación (Especialista)',
  IN_REEVALUATION: 'Reevaluar y devolver o aprobar para pilotaje',
  APPROVED_FOR_PILOT: 'Iniciar el pilotaje (Vicerrectoría Académica)',
  IN_PILOT: 'Evaluar el pilotaje (VPID)',
  EVALUATED: 'Finalizar o solicitar ajustes posteriores al pilotaje',
  FINAL: 'Archivar o implementar (CINGEP)',
  ARCHIVED_IMPLEMENTED: 'Sin acciones pendientes',
};

export function proximaAccion(codigo: string): string {
  return PROXIMA_ACCION[codigo] ?? 'Consultar con la Dirección de Gestión Curricular';
}

/** Estados desde los que el especialista puede decidir (T3, T4, T7 y T8 de ADR-014). */
export function admiteDecisionTecnica(codigo: string): boolean {
  return codigo === 'IN_REVIEW' || codigo === 'IN_REEVALUATION';
}

export function grupoDeEstado(codigo: string): GrupoEstado {
  return ESTADOS_UNDERGRAD[codigo]?.grupo ?? 'otros';
}

export function tonoDeEstado(codigo: string): TonoEstado {
  return ESTADOS_UNDERGRAD[codigo]?.tono ?? 'neutral';
}

export function contarPorGrupo(codigos: readonly string[]): Record<GrupoEstado, number> {
  const conteo: Record<GrupoEstado, number> = {
    recepcion: 0,
    revision: 0,
    ajustes: 0,
    aprobacion: 0,
    cierre: 0,
    otros: 0,
  };
  codigos.forEach((codigo) => {
    conteo[grupoDeEstado(codigo)] += 1;
  });
  return conteo;
}

/** Segmentos de `conic-gradient` proporcionales al conteo; vacío si no hay expedientes. */
export function segmentosDona(conteo: Record<GrupoEstado, number>): string {
  const total = Object.values(conteo).reduce((suma, valor) => suma + valor, 0);
  if (total === 0) return 'var(--state-empty) 0 100%';
  let inicio = 0;
  return GRUPOS_ESTADO.filter((grupo) => conteo[grupo.id] > 0)
    .map((grupo) => {
      const fin = inicio + (conteo[grupo.id] / total) * 100;
      const segmento = `${grupo.color} ${inicio.toFixed(2)}% ${fin.toFixed(2)}%`;
      inicio = fin;
      return segmento;
    })
    .join(', ');
}
