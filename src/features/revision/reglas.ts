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
export type AccionRevision = 'devolver' | 'aprobar';

/** Códigos de transición de ADR-014 §3 que corresponden a cada decisión técnica. */
export const TRANSICIONES_DECISION: Readonly<Record<AccionRevision, readonly string[]>> = {
  devolver: ['REQUEST_CHANGES', 'REQUEST_CHANGES_AGAIN'],
  aprobar: ['APPROVE_FOR_PILOT', 'APPROVE_FOR_PILOT_AFTER_REEVALUATION'],
};

export const CODIGOS_DECISION: readonly string[] = Object.values(TRANSICIONES_DECISION).flat();

/**
 * Reglas REG-01 y REG-06 del Informe Módulo II. Devuelve el error que impide la decisión o
 * `null` si puede enviarse; el servidor vuelve a validar la transición (REG-05).
 */
export function validarAccion(
  accion: AccionRevision,
  observaciones: string,
  resultados: readonly ResultadoCriterio[],
): { kind: AlertKind; texto: string } | null {
  const { completo, noCumple } = resumirChecklist(resultados);
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
    return null;
  }
  if (!completo) {
    return { kind: 'error', texto: 'Evalúe todos los criterios antes de aprobar.' };
  }
  if (noCumple > 0) {
    return {
      kind: 'error',
      texto: 'Hay criterios obligatorios en "No cumple": la aprobación queda bloqueada (REG-06).',
    };
  }
  return null;
}

/**
 * El contrato MVP no tiene ruta propia para los resultados del checklist; se conservan en la
 * observación de la transición para que queden en el historial del expediente.
 */
export function componerObservacion(
  resultados: readonly ResultadoCriterio[],
  observaciones: string,
): string {
  const lineas = CRITERIOS.map((criterio, indice) => {
    const resultado = OPCIONES_RESULTADO.find((opcion) => opcion.valor === resultados[indice]);
    return `- ${criterio.texto}: ${resultado?.etiqueta ?? 'Sin evaluar'}`;
  });
  const texto = observaciones.trim();
  return [`Checklist técnico-curricular:`, ...lineas, ...(texto ? ['', texto] : [])].join('\n');
}
