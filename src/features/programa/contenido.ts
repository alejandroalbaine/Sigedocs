/**
 * Contenido del programa según template-data-contract.md §7: objeto indexado por la `key` de
 * la sección y luego por la `key` del campo. Cada elemento de un grupo repetible lleva un
 * `itemId` generado por el cliente; un valor de catálogo se guarda como `{ value, label }`.
 */
import type {
  TemplateField,
  TemplateOption,
  TemplateVersion,
} from '../../common/api/templateContract.ts';

export type Valor = unknown;
export type Item = Record<string, Valor> & { itemId: string };
export type Contenido = Record<string, Record<string, Valor>>;

export function nuevoId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item-${String(Date.now())}-${Math.random().toString(16).slice(2)}`;
}

export function esCatalogo(campo: TemplateField): boolean {
  return campo.optionsSource !== undefined;
}

export function valorInicial(campo: TemplateField): Valor {
  if (campo.defaultValue !== undefined) return campo.defaultValue;
  switch (campo.type) {
    case 'boolean':
      return false;
    case 'number':
      return null;
    case 'multi_select':
    case 'repeatable_group':
      return [];
    case 'select':
      return esCatalogo(campo) ? null : '';
    default:
      return '';
  }
}

export function nuevoItem(campos: readonly TemplateField[]): Item {
  const item: Item = { itemId: nuevoId() };
  for (const campo of campos) item[campo.key] = valorInicial(campo);
  return item;
}

function completarItems(valor: Valor, campos: readonly TemplateField[]): Item[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((bruto) => {
    const base =
      typeof bruto === 'object' && bruto !== null ? (bruto as Record<string, Valor>) : {};
    const item: Item = { itemId: typeof base.itemId === 'string' ? base.itemId : nuevoId() };
    for (const campo of campos) {
      item[campo.key] =
        campo.type === 'repeatable_group'
          ? completarItems(base[campo.key], campo.config?.fields ?? [])
          : (base[campo.key] ?? valorInicial(campo));
    }
    return item;
  });
}

/** Completa el contenido recibido con los valores por defecto de la plantilla. */
export function contenidoInicial(plantilla: TemplateVersion, recibido: Valor): Contenido {
  const origen =
    typeof recibido === 'object' && recibido !== null ? (recibido as Contenido) : ({} as Contenido);
  const contenido: Contenido = {};
  for (const seccion of plantilla.sections.filter((item) => item.isActive)) {
    const datos = origen[seccion.key] ?? {};
    const destino: Record<string, Valor> = {};
    for (const campo of seccion.fields) {
      destino[campo.key] =
        campo.type === 'repeatable_group'
          ? completarItems(datos[campo.key], campo.config?.fields ?? [])
          : (datos[campo.key] ?? valorInicial(campo));
    }
    contenido[seccion.key] = destino;
  }
  return contenido;
}

/** Representa en texto un valor para la vista de solo lectura. */
export function mostrarValor(campo: TemplateField, valor: Valor): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (campo.type === 'boolean') return valor === true ? 'Sí' : 'No';
  const etiqueta = (item: Valor): string => {
    if (typeof item === 'object' && item !== null && 'label' in item) {
      return (item as TemplateOption).label;
    }
    if (typeof item !== 'string' && typeof item !== 'number') return '—';
    return campo.options?.find((opcion) => opcion.value === item)?.label ?? String(item);
  };
  if (Array.isArray(valor)) return valor.length ? valor.map(etiqueta).join(', ') : '—';
  if (campo.type === 'number' && campo.format === 'percentage') return `${etiqueta(valor)} %`;
  return etiqueta(valor);
}
