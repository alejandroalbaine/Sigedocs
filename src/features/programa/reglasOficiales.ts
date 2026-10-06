import type { TemplateRule, TemplateVersion } from '../../common/api/templateContract.ts';
import type { Contenido } from './contenido.ts';
import { sumar, type Hallazgo } from './validacion.ts';

/** Solo estos dos límites oficiales bloquean el envío local; el servidor valida el resto. */
export function validarLimitesOficiales(
  plantilla: TemplateVersion,
  contenido: Contenido,
  codigo: string,
): Hallazgo[] {
  if (codigo !== 'COURSE_PROGRAM') return [];
  const hallazgos: Hallazgo[] = [];
  const unidades = plantilla.sections
    .find((item) => item.isActive && item.key === 'unidades_didacticas')
    ?.fields.find((item) => item.key === 'unidades_didacticas' && item.type === 'repeatable_group');
  const items = contenido.unidades_didacticas?.unidades_didacticas;
  if (unidades && Array.isArray(items) && items.length > 10)
    hallazgos.push({
      ruta: 'unidades_didacticas.unidades_didacticas',
      mensaje: 'El programa admite como máximo 10 unidades didácticas.',
      severidad: 'error',
    });
  const evaluacion = plantilla.sections
    .find((item) => item.isActive && item.key === 'plan_evaluacion')
    ?.fields.find(
      (item) => item.key === 'componentes_evaluacion' && item.type === 'repeatable_group',
    );
  if (evaluacion?.config?.fields?.some((item) => item.key === 'porcentaje')) {
    const total = sumar(contenido, 'plan_evaluacion', ['componentes_evaluacion', 'porcentaje']);
    if (Math.abs(total - 100) > 0.001)
      hallazgos.push({
        ruta: 'plan_evaluacion.componentes_evaluacion',
        mensaje: `Los porcentajes del plan de evaluación deben sumar 100 %. Suma actual: ${String(total)}.`,
        severidad: 'error',
      });
  }
  return hallazgos;
}

/** Resolución 02-2025: el backend MVP aún omite las reglas de primer nivel/documento.
 * Se limita a COURSE_PROGRAM y sus claves oficiales; las demás plantillas conservan sus reglas.
 */
export function conReglasOficiales(plantilla: TemplateVersion, codigo: string): TemplateVersion {
  if (codigo !== 'COURSE_PROGRAM') return plantilla;
  const regla = (
    id: string,
    type: TemplateRule['type'],
    scope: TemplateRule['scope'],
    params: Record<string, unknown>,
    message: string,
  ): TemplateRule => ({
    ruleId: id,
    code: id,
    type,
    scope,
    params,
    message,
    severity: 'error',
    isActive: true,
  });
  const sections = plantilla.sections.map((seccion) =>
    seccion.key !== 'unidades_didacticas'
      ? seccion
      : {
          ...seccion,
          fields: seccion.fields.map((campo) => {
            if (campo.key !== 'unidades_didacticas' || campo.type !== 'repeatable_group')
              return campo;
            const tieneMaximo = campo.rules?.some(
              (item) =>
                item.isActive &&
                item.severity === 'error' &&
                item.type === 'cardinality' &&
                typeof item.params.maxItems === 'number' &&
                item.params.maxItems <= 10,
            );
            return tieneMaximo
              ? campo
              : {
                  ...campo,
                  rules: [
                    ...(campo.rules ?? []),
                    regla(
                      'OFICIAL_MAX_UNIDADES',
                      'cardinality',
                      'field',
                      { maxItems: 10 },
                      'El programa admite como máximo 10 unidades didácticas.',
                    ),
                  ],
                };
          }),
        },
  );
  const evaluacion = sections
    .find((item) => item.isActive && item.key === 'plan_evaluacion')
    ?.fields.find(
      (item) => item.key === 'componentes_evaluacion' && item.type === 'repeatable_group',
    );
  const rules = [...(plantilla.rules ?? [])];
  const tieneSuma = [
    ...rules,
    ...(sections.find((item) => item.key === 'plan_evaluacion')?.rules ?? []),
  ].some(
    (item) =>
      item.isActive &&
      item.severity === 'error' &&
      item.type === 'sum_equals' &&
      item.params.expectedValue === 100 &&
      (item.target?.section ?? 'plan_evaluacion') === 'plan_evaluacion' &&
      Array.isArray(item.target?.fieldPath) &&
      item.target.fieldPath.join('.') === 'componentes_evaluacion.porcentaje',
  );
  if (evaluacion?.config?.fields?.some((item) => item.key === 'porcentaje') && !tieneSuma) {
    rules.push({
      ...regla(
        'OFICIAL_SUM_EVALUACION',
        'sum_equals',
        'document',
        { expectedValue: 100 },
        'Los porcentajes del plan de evaluación deben sumar 100 %.',
      ),
      target: { section: 'plan_evaluacion', fieldPath: ['componentes_evaluacion', 'porcentaje'] },
    });
  }
  return { ...plantilla, sections, rules };
}
