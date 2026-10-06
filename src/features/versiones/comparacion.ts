/**
 * Comparación del contenido de dos versiones de un expediente, sección por sección y campo por
 * campo (template-data-contract.md §7). La plantilla da el orden y las etiquetas; el contenido
 * se compara por la `key` de cada sección y campo. Los elementos de un grupo repetible se
 * emparejan por su `itemId`, así que un elemento movido no aparece como quitado y agregado.
 * Un valor de catálogo se compara por su `value`: la etiqueta guardada es solo una copia.
 */
import type {
  TemplateField,
  TemplateSection,
  TemplateVersion,
} from '../../common/api/templateContract.ts';
import type { BadgeTone } from '../../common/components/index.ts';
import { mostrarValor, valorInicial, type Valor } from '../programa/contenido.ts';
import { diferenciaTexto, type DiferenciaTexto } from './diferenciaTexto.ts';

export type TipoCambio = 'igual' | 'agregado' | 'eliminado' | 'modificado';

/** Cómo se nombra el cambio de un campo: «agregado» es que antes estaba vacío. */
export const CAMBIO_CAMPO: Record<TipoCambio, string> = {
  igual: 'Sin cambios',
  agregado: 'Completado',
  eliminado: 'Vaciado',
  modificado: 'Modificado',
};

export const CAMBIO_ELEMENTO: Record<TipoCambio, string> = {
  igual: 'Sin cambios',
  agregado: 'Agregado',
  eliminado: 'Quitado',
  modificado: 'Modificado',
};

export const TONO_CAMBIO: Record<TipoCambio, BadgeTone> = {
  igual: 'neutral',
  agregado: 'success',
  eliminado: 'danger',
  modificado: 'warning',
};

/** «1 campo», «3 campos». */
export function cantidad(n: number, singular: string, plural: string): string {
  return `${String(n)} ${n === 1 ? singular : plural}`;
}

export interface CampoComparado {
  key: string;
  etiqueta: string;
  tipo: TipoCambio;
  /** Valor de cada versión tal como se muestra en el formulario de solo lectura. */
  antes: string;
  despues: string;
  /** Campos de texto modificados: qué palabras se quitaron y cuáles se agregaron. */
  texto?: DiferenciaTexto;
  /** Selección múltiple modificada: opciones que se agregaron y que se quitaron. */
  opciones?: { agregadas: string[]; quitadas: string[] };
  /** Grupo repetible: sus elementos, emparejados por `itemId`. */
  elementos?: ElementoComparado[];
  /** Grupo repetible con los mismos elementos en otro orden. */
  reordenado?: boolean;
}

export interface ElementoComparado {
  itemId: string;
  tipo: TipoCambio;
  /** Posición (desde 1) en cada versión; `null` si el elemento no existe en esa versión. */
  posicionAntes: number | null;
  posicionDespues: number | null;
  /** Cambió de lugar respecto de los demás (no basta con que se haya quitado otro antes). */
  movido: boolean;
  /** Primer texto del elemento, para reconocerlo sin abrirlo (p. ej. el nombre de la unidad). */
  resumen: string;
  campos: CampoComparado[];
}

export interface SeccionComparada {
  key: string;
  titulo: string;
  campos: CampoComparado[];
  /** Campos de la sección con algún cambio. */
  cambios: number;
}

export interface Comparacion {
  secciones: SeccionComparada[];
  /** Campos con algún cambio en todo el programa. */
  cambios: number;
  seccionesConCambios: number;
}

type Contenido = Record<string, unknown>;

const porPosicion = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

function registro(valor: unknown): Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

/** Une dos listas por `key` en el orden de la más reciente; lo que solo tiene la anterior va al final. */
function unir<T extends { key: string; position: number }>(
  anteriores: readonly T[],
  posteriores: readonly T[],
): T[] {
  const claves = new Set(posteriores.map((item) => item.key));
  return [
    ...[...posteriores].sort(porPosicion),
    ...[...anteriores].sort(porPosicion).filter((item) => !claves.has(item.key)),
  ];
}

function camposDe(campo: TemplateField): TemplateField[] {
  return campo.config?.fields ?? [];
}

/** Clave estable de una opción: el `value` de un catálogo o el valor guardado. */
function claveOpcion(valor: Valor): string {
  const clave =
    typeof valor === 'object' && valor !== null && 'value' in valor ? valor.value : valor;
  return typeof clave === 'string' || typeof clave === 'number' ? String(clave) : '';
}

function texto(valor: Valor): string {
  return typeof valor === 'string' ? valor.replace(/\r\n?/g, '\n').trim() : '';
}

/**
 * Texto para decidir si cambió: los espacios repetidos o no separables dentro de una línea no
 * cuentan, porque la vista de solo lectura los muestra igual (`white-space: pre-line`).
 */
function textoCanonico(valor: Valor): string {
  return texto(valor)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n');
}

/**
 * Forma canónica de un valor para decidir si cambió: vacío (`null`, `''`, `[]`, sin valor) es
 * siempre `null`, el texto se compara sin espacios en los extremos y la selección múltiple
 * como conjunto.
 */
function canonico(campo: TemplateField, bruto: Valor): unknown {
  const valor = bruto ?? valorInicial(campo);
  switch (campo.type) {
    case 'boolean':
      return valor === true;
    case 'number': {
      if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
      if (typeof valor !== 'string') return valor === null ? null : JSON.stringify(valor);
      const escrito = valor.trim();
      return escrito === '' ? null : Number.isFinite(Number(escrito)) ? Number(escrito) : escrito;
    }
    case 'multi_select': {
      const claves = Array.isArray(valor) ? valor.map(claveOpcion).filter(Boolean) : [];
      return claves.length ? [...new Set(claves)].sort() : null;
    }
    case 'select':
      return claveOpcion(valor) || null;
    case 'repeatable_group':
      return null;
    default:
      return textoCanonico(valor) || null;
  }
}

function tipoDeCambio(antes: unknown, despues: unknown): TipoCambio {
  if (JSON.stringify(antes) === JSON.stringify(despues)) return 'igual';
  if (antes === null) return 'agregado';
  if (despues === null) return 'eliminado';
  return 'modificado';
}

/** Etiqueta de cada opción de una selección múltiple, indexada por su clave. */
function etiquetasOpciones(campo: TemplateField, valor: Valor): Map<string, string> {
  const etiquetas = new Map<string, string>();
  if (!Array.isArray(valor)) return etiquetas;
  for (const opcion of valor) {
    const clave = claveOpcion(opcion);
    if (clave) etiquetas.set(clave, mostrarValor(campo, [opcion]));
  }
  return etiquetas;
}

function compararOpciones(campo: TemplateField, antes: Valor, despues: Valor) {
  const anteriores = etiquetasOpciones(campo, antes);
  const posteriores = etiquetasOpciones(campo, despues);
  return {
    agregadas: [...posteriores].filter(([clave]) => !anteriores.has(clave)).map(([, e]) => e),
    quitadas: [...anteriores].filter(([clave]) => !posteriores.has(clave)).map(([, e]) => e),
  };
}

interface ItemBruto {
  itemId: string;
  datos: Record<string, unknown>;
}

/** Elementos de un grupo; sin `itemId` (o con uno repetido) se emparejan por posición. */
function itemsDe(valor: Valor): ItemBruto[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  return valor.map((bruto, indice) => {
    const datos = registro(bruto);
    const propio = typeof datos.itemId === 'string' ? datos.itemId : '';
    const itemId = propio && !vistos.has(propio) ? propio : `#${String(indice)}`;
    vistos.add(itemId);
    return { itemId, datos };
  });
}

/**
 * Elementos que cambiaron de lugar: los que quedan fuera de la subsecuencia más larga que
 * conserva el orden anterior. Así, quitar un elemento no marca como movidos a los siguientes.
 */
function movidos(orden: readonly { itemId: string; previo: number }[]): Set<string> {
  // O(n²): un grupo del programa tiene pocos elementos.
  const largo = orden.map(() => 1);
  const anterior = orden.map(() => -1);
  orden.forEach((actual, i) => {
    for (let j = 0; j < i; j++) {
      const candidato = orden[j];
      if (candidato && candidato.previo < actual.previo && (largo[j] ?? 0) + 1 > (largo[i] ?? 0)) {
        largo[i] = (largo[j] ?? 0) + 1;
        anterior[i] = j;
      }
    }
  });
  const fijos = new Set<string>();
  let fin = largo.indexOf(Math.max(0, ...largo));
  while (fin >= 0) {
    const item = orden[fin];
    if (item) fijos.add(item.itemId);
    fin = anterior[fin] ?? -1;
  }
  return new Set(orden.map((item) => item.itemId).filter((itemId) => !fijos.has(itemId)));
}

function resumenElemento(campos: readonly TemplateField[], datos: Record<string, unknown>) {
  for (const campo of [...campos].sort(porPosicion)) {
    if (campo.type !== 'text' && campo.type !== 'long_text') continue;
    const valor = texto(datos[campo.key]);
    if (valor) return valor.length > 90 ? `${valor.slice(0, 90).trimEnd()}…` : valor;
  }
  return '';
}

function compararGrupo(
  campo: TemplateField,
  subcampos: readonly TemplateField[],
  antes: Valor,
  despues: Valor,
): CampoComparado {
  const anteriores = itemsDe(antes);
  const posteriores = itemsDe(despues);
  const indiceAnterior = new Map(anteriores.map((item, indice) => [item.itemId, indice]));
  const idsPosteriores = new Set(posteriores.map((item) => item.itemId));

  const elemento = (
    itemId: string,
    datosAntes: Record<string, unknown> | null,
    datosDespues: Record<string, unknown> | null,
    posicionAntes: number | null,
    posicionDespues: number | null,
  ): ElementoComparado => {
    const campos = subcampos.map((subcampo) =>
      compararCampo(subcampo, datosAntes?.[subcampo.key], datosDespues?.[subcampo.key]),
    );
    const tipo: TipoCambio = !datosAntes
      ? 'agregado'
      : !datosDespues
        ? 'eliminado'
        : campos.some((item) => item.tipo !== 'igual')
          ? 'modificado'
          : 'igual';
    return {
      itemId,
      tipo,
      posicionAntes,
      posicionDespues,
      movido: false,
      resumen: resumenElemento(subcampos, datosDespues ?? datosAntes ?? {}),
      campos,
    };
  };

  // Se sigue el orden de la versión posterior; cada elemento quitado se intercala donde estaba.
  const elementos: ElementoComparado[] = [];
  let siguienteAnterior = 0;
  const quitadosHasta = (limite: number) => {
    for (; siguienteAnterior < limite; siguienteAnterior++) {
      const item = anteriores[siguienteAnterior];
      if (item && !idsPosteriores.has(item.itemId)) {
        elementos.push(elemento(item.itemId, item.datos, null, siguienteAnterior + 1, null));
      }
    }
  };
  const ordenAnterior: { itemId: string; previo: number }[] = [];
  posteriores.forEach((item, indice) => {
    const previo = indiceAnterior.get(item.itemId);
    if (previo !== undefined) {
      quitadosHasta(previo);
      ordenAnterior.push({ itemId: item.itemId, previo });
    }
    const datosAntes = previo === undefined ? null : (anteriores[previo]?.datos ?? null);
    elementos.push(
      elemento(
        item.itemId,
        datosAntes,
        item.datos,
        previo === undefined ? null : previo + 1,
        indice + 1,
      ),
    );
  });
  quitadosHasta(anteriores.length);

  const fueraDeLugar = movidos(ordenAnterior);
  for (const item of elementos) item.movido = fueraDeLugar.has(item.itemId);
  const reordenado = fueraDeLugar.size > 0;
  const hayCambios = reordenado || elementos.some((item) => item.tipo !== 'igual');
  const elementosDe = (n: number) => cantidad(n, 'elemento', 'elementos');
  return {
    key: campo.key,
    etiqueta: campo.label,
    tipo: !hayCambios
      ? 'igual'
      : anteriores.length === 0
        ? 'agregado'
        : posteriores.length === 0
          ? 'eliminado'
          : 'modificado',
    antes: elementosDe(anteriores.length),
    despues: elementosDe(posteriores.length),
    elementos,
    ...(reordenado ? { reordenado } : {}),
  };
}

export function compararCampo(campo: TemplateField, antes: Valor, despues: Valor): CampoComparado {
  if (campo.type === 'repeatable_group') {
    return compararGrupo(campo, [...camposDe(campo)].sort(porPosicion), antes, despues);
  }
  const tipo = tipoDeCambio(canonico(campo, antes), canonico(campo, despues));
  const comparado: CampoComparado = {
    key: campo.key,
    etiqueta: campo.label,
    tipo,
    antes: mostrarValor(campo, antes ?? valorInicial(campo)),
    despues: mostrarValor(campo, despues ?? valorInicial(campo)),
  };
  if (tipo === 'modificado' && (campo.type === 'text' || campo.type === 'long_text')) {
    comparado.texto = diferenciaTexto(texto(antes), texto(despues));
  }
  if (tipo !== 'igual' && campo.type === 'multi_select') {
    comparado.opciones = compararOpciones(campo, antes, despues);
  }
  return comparado;
}

/**
 * Compara el contenido de dos versiones. Cada versión se lee con su propia plantilla; si las
 * plantillas difieren, se muestran las secciones y campos de ambas (las etiquetas de la
 * posterior tienen prioridad).
 */
export function compararContenido(
  anterior: { plantilla: TemplateVersion; contenido: Contenido },
  posterior: { plantilla: TemplateVersion; contenido: Contenido },
): Comparacion {
  const activas = (plantilla: TemplateVersion) =>
    plantilla.sections.filter((seccion) => seccion.isActive);
  const seccionAnterior = new Map(
    activas(anterior.plantilla).map((seccion) => [seccion.key, seccion]),
  );
  const secciones = unir<TemplateSection>(
    activas(anterior.plantilla),
    activas(posterior.plantilla),
  ).map((seccion): SeccionComparada => {
    const campos = unir(seccionAnterior.get(seccion.key)?.fields ?? [], seccion.fields).map(
      (campo) =>
        compararCampo(
          campo,
          registro(anterior.contenido[seccion.key])[campo.key],
          registro(posterior.contenido[seccion.key])[campo.key],
        ),
    );
    return {
      key: seccion.key,
      titulo: seccion.title,
      campos,
      cambios: campos.filter((campo) => campo.tipo !== 'igual').length,
    };
  });
  return {
    secciones,
    cambios: secciones.reduce((total, seccion) => total + seccion.cambios, 0),
    seccionesConCambios: secciones.filter((seccion) => seccion.cambios > 0).length,
  };
}

/** «De v1.1 a v1.2 cambiaron 3 campos en 2 de 9 secciones.» */
export function resumenComparacion(
  comparacion: Comparacion,
  base: string,
  comparada: string,
): string {
  if (comparacion.cambios === 0) return `${base} y ${comparada} tienen el mismo contenido.`;
  const verbo = comparacion.cambios === 1 ? 'cambió' : 'cambiaron';
  const campos = cantidad(comparacion.cambios, 'campo', 'campos');
  const secciones = cantidad(comparacion.secciones.length, 'sección', 'secciones');
  return `De ${base} a ${comparada} ${verbo} ${campos} en ${String(comparacion.seccionesConCambios)} de ${secciones}.`;
}
