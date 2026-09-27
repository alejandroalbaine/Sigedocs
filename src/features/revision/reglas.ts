import type { AlertKind } from '../../common/components/Alert/Alert.tsx';

/**
 * Criterios del checklist técnico-curricular (Informe T1 §1.3.1: lo que verifica el especialista
 * y el documento maestro contra el que se contrasta). En el MVP todos son obligatorios; la
 * configuración de listas por plantilla (CU-11) llegará con el motor de plantillas.
 */
export const CRITERIOS = [
  {
    id: 'identificacion',
    texto: 'Nombre, código y créditos de la asignatura',
    referencia: 'Pensum',
  },
  {
    id: 'ubicacion',
    texto: 'Periodo, prerrequisitos y carga de trabajo',
    referencia: 'Plan de estudio',
  },
  {
    id: 'competencias',
    texto: 'Competencias fundamentales y específicas',
    referencia: 'Malla curricular',
  },
  {
    id: 'coherencia',
    texto: 'Contenidos y resultados de aprendizaje coherentes',
    referencia: 'Programa de asignatura',
  },
  {
    id: 'evaluacion',
    texto: 'Metodología y evaluación apropiadas (suman 100 %)',
    referencia: 'Programa de asignatura',
  },
] as const;

export type ResultadoCriterio = 'cumple' | 'no_cumple' | 'no_aplica' | null;

export const OPCIONES_RESULTADO: readonly {
  valor: Exclude<ResultadoCriterio, null>;
  etiqueta: string;
}[] = [
  { valor: 'cumple', etiqueta: 'Cumple' },
  { valor: 'no_cumple', etiqueta: 'No cumple' },
  { valor: 'no_aplica', etiqueta: 'No aplica' },
];

export function resultadosIniciales(): ResultadoCriterio[] {
  return CRITERIOS.map(() => null);
}

export function resumirChecklist(resultados: readonly ResultadoCriterio[]) {
  const evaluados = resultados.filter((valor) => valor !== null).length;
  const noCumple = resultados.filter((valor) => valor === 'no_cumple').length;
  return { evaluados, noCumple, total: CRITERIOS.length, completo: evaluados === CRITERIOS.length };
}

/** Decisiones del especialista según ADR-014: devolver (T3/T7) o aprobar para pilotaje (T4/T8). */
export type AccionRevision = 'borrador' | 'devolver' | 'aprobar';

/**
 * Reglas REG-01 y REG-06 del Informe Módulo II. Ninguna acción se envía todavía: el backend no
 * implementa `POST /api/v1/dossiers/{dossierId}/transitions` (contrato confirmado, ADR-014 §4).
 */
export function validarAccion(
  accion: AccionRevision,
  observaciones: string,
  resultados: readonly ResultadoCriterio[],
): { kind: AlertKind; texto: string } {
  const { completo, noCumple } = resumirChecklist(resultados);
  if (accion === 'borrador') {
    return {
      kind: 'info',
      texto:
        'El borrador se conserva solo en esta pantalla hasta que exista la ruta de revisiones.',
    };
  }
  if (accion === 'devolver') {
    if (noCumple === 0) {
      return {
        kind: 'error',
        texto: 'Para devolver, marque como "No cumple" al menos un criterio (REG-01).',
      };
    }
    if (!observaciones.trim()) {
      return {
        kind: 'error',
        texto: 'La devolución exige observaciones que expliquen cada incumplimiento.',
      };
    }
  }
  if (accion === 'aprobar') {
    if (!completo) {
      return { kind: 'error', texto: 'Evalúe todos los criterios antes de aprobar.' };
    }
    if (noCumple > 0) {
      return {
        kind: 'error',
        texto: 'Hay criterios obligatorios en "No cumple": la aprobación queda bloqueada (REG-06).',
      };
    }
  }
  return {
    kind: 'info',
    texto:
      'La decisión no se envió: el backend todavía no implementa la ruta de transiciones del flujo.',
  };
}
