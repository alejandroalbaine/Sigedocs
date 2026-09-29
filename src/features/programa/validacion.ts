/**
 * Evaluación local de las reglas del MVP (template-data-contract.md §6). El backend es la
 * autoridad final (TPL-03); aquí solo se adelanta el aviso junto al campo.
 */
import type {
  TemplateDefinition,
  TemplateField,
  TemplateRule,
} from '../../common/api/templateContract.ts';
import type { Contenido, Item, Valor } from './contenido.ts';

export interface Hallazgo {
  ruta: string;
  mensaje: string;
  severidad: 'error' | 'warning';
}

/** Ruta estable de un campo: `seccion.campo` o `seccion.grupo[itemId].campo`. */
export const ruta = (...partes: string[]) => partes.join('.');

function vacio(campo: TemplateField, valor: Valor): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0;
  if (campo.type === 'boolean') return false;
  return false;
}

const numero = (valor: Valor, clave: string): number | undefined => {
  const params = valor as Record<string, unknown>;
  const dato = params[clave];
  return typeof dato === 'number' ? dato : undefined;
};

function mensajeRegla(regla: TemplateRule, campo: TemplateField): string {
  if (regla.message) return regla.message;
  const p = regla.params;
  switch (regla.type) {
    case 'cardinality': {
      const min = numero(p, 'minItems');
      const max = numero(p, 'maxItems');
      if (min !== undefined && max !== undefined) {
        return `Agregue entre ${String(min)} y ${String(max)} elementos en "${campo.label}".`;
      }
      if (min !== undefined)
        return `Agregue al menos ${String(min)} elemento(s) en "${campo.label}".`;
      return `"${campo.label}" admite como máximo ${String(max)} elementos.`;
    }
    case 'length':
      return `"${campo.label}" debe tener entre ${String(numero(p, 'min') ?? 0)} y ${String(numero(p, 'max') ?? '∞')} caracteres.`;
    case 'range':
      return `"${campo.label}" debe estar entre ${String(numero(p, 'min') ?? '−∞')} y ${String(numero(p, 'max') ?? '∞')}.`;
    case 'pattern':
      return `"${campo.label}" no tiene el formato esperado.`;
    default:
      return `"${campo.label}" no cumple una regla de la plantilla.`;
  }
}

function incumple(regla: TemplateRule, valor: Valor): boolean {
  const p = regla.params;
  switch (regla.type) {
    case 'cardinality': {
      const cantidad = Array.isArray(valor) ? valor.length : 0;
      const min = numero(p, 'minItems');
      const max = numero(p, 'maxItems');
      return (min !== undefined && cantidad < min) || (max !== undefined && cantidad > max);
    }
    case 'length': {
      if (typeof valor !== 'string' || valor === '') return false;
      const min = numero(p, 'min');
      const max = numero(p, 'max');
      return (min !== undefined && valor.length < min) || (max !== undefined && valor.length > max);
    }
    case 'range': {
      if (typeof valor !== 'number') return false;
      const min = numero(p, 'min');
      const max = numero(p, 'max');
      return (min !== undefined && valor < min) || (max !== undefined && valor > max);
    }
    case 'pattern': {
      if (typeof valor !== 'string' || valor === '' || typeof p.regex !== 'string') return false;
      try {
        return !new RegExp(p.regex).test(valor);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function validarCampos(
  campos: readonly TemplateField[],
  datos: Record<string, Valor>,
  base: string,
  hallazgos: Hallazgo[],
) {
  for (const campo of campos) {
    const valor = datos[campo.key];
    const destino = ruta(base, campo.key);
    if (campo.isRequired && vacio(campo, valor)) {
      hallazgos.push({ ruta: destino, mensaje: `Complete "${campo.label}".`, severidad: 'error' });
    }
    for (const regla of (campo.rules ?? []).filter((item) => item.isActive)) {
      if (incumple(regla, valor)) {
        hallazgos.push({
          ruta: destino,
          mensaje: mensajeRegla(regla, campo),
          severidad: regla.severity,
        });
      }
    }
    if (campo.type === 'repeatable_group' && Array.isArray(valor)) {
      for (const item of valor as Item[]) {
        validarCampos(campo.config?.fields ?? [], item, `${destino}[${item.itemId}]`, hallazgos);
      }
    }
  }
}

/** Suma de `fieldPath` dentro de una sección (regla `sum_equals`, p. ej. evaluación = 100 %). */
export function sumar(contenido: Contenido, seccion: string, camino: readonly string[]): number {
  const recorrer = (valor: Valor, resto: readonly string[]): number => {
    if (resto.length === 0) return typeof valor === 'number' ? valor : Number(valor) || 0;
    if (Array.isArray(valor))
      return valor.reduce<number>((t, item) => t + recorrer(item, resto), 0);
    if (typeof valor === 'object' && valor !== null) {
      const [clave, ...siguiente] = resto;
      return recorrer((valor as Record<string, Valor>)[clave ?? ''], siguiente);
    }
    return 0;
  };
  return recorrer(contenido[seccion], camino);
}

export function validarContenido(plantilla: TemplateDefinition, contenido: Contenido): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  for (const seccion of plantilla.version.sections.filter((item) => item.isActive)) {
    validarCampos(seccion.fields, contenido[seccion.key] ?? {}, seccion.key, hallazgos);
  }
  for (const regla of (plantilla.version.rules ?? []).filter((item) => item.isActive)) {
    if (regla.type !== 'sum_equals') continue;
    const objetivo = regla.target as { section?: string; fieldPath?: string[] } | undefined;
    const esperado = numero(regla.params, 'expectedValue');
    if (!objetivo?.section || !objetivo.fieldPath || esperado === undefined) continue;
    const total = sumar(contenido, objetivo.section, objetivo.fieldPath);
    if (Math.abs(total - esperado) > 0.001) {
      hallazgos.push({
        ruta: ruta(objetivo.section, objetivo.fieldPath[0] ?? ''),
        mensaje: `${regla.message || 'La suma no coincide con el valor esperado.'} Suma actual: ${String(total)}.`,
        severidad: regla.severity,
      });
    }
  }
  return hallazgos;
}
